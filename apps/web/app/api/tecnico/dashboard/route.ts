import { type NextRequest, NextResponse } from 'next/server';
import { createAnonClient, createServiceRoleClient } from '@/lib/supabase/server';
import { supabaseConfigError, supabaseServerConfigError } from '@/lib/supabase/config';

const getAuthenticatedUser = async (authHeader: string) => {
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('No authentication token');

  const supabase = createAnonClient();

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid token');

  return data.user;
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const user = await getAuthenticatedUser(authHeader);

    const supabase = createServiceRoleClient();

    // Fetch technician profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(
        `
        id,
        full_name,
        phone,
        city,
        service_lat,
        service_lng,
        working_hours,
        access_granted,
        profile_published
      `,
      )
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      throw new Error('Technician profile not found');
    }

    // Parse working hours
    const workingHours = profileData.working_hours ? JSON.parse(profileData.working_hours) : null;
    const withinWorkingHours = workingHours
      ? isNowWithinWorkingHours(workingHours)
      : true;

    const workingHoursLabel = workingHours
      ? formatWorkingHoursLabel(workingHours)
      : null;

    // Fetch nearby requests with response status
    const { data: requestsData, error: requestsError } = await supabase
      .from('master_requests')
      .select(
        `
        id,
        title,
        description,
        category,
        urgency,
        status,
        mode,
        city,
        address,
        created_at,
        location_lat,
        location_lng,
        request_quotes (
          id,
          quote_status,
          response_type,
          visit_eta_hours,
          price_ars,
          eta_hours,
          updated_at
        )
      `,
      )
      .eq('status', 'published')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (requestsError) {
      throw new Error(`Failed to fetch requests: ${requestsError.message}`);
    }

    // Filter and enrich requests
    const requests = (requestsData || [])
      .map((req: any) => {
        const myQuote = (req.request_quotes || []).find((q: any) => q.id === user.id);

        return {
          id: req.id,
          title: req.title,
          description: req.description,
          category: req.category,
          urgency: req.urgency,
          status: req.status,
          mode: req.mode,
          city: req.city,
          address: req.address,
          created_at: req.created_at,
          location_lat: req.location_lat,
          location_lng: req.location_lng,
          my_quote_status: myQuote?.quote_status || null,
          my_response_type: myQuote?.response_type || null,
          my_visit_eta_hours: myQuote?.visit_eta_hours || null,
          my_price_ars: myQuote?.price_ars || null,
          my_eta_hours: myQuote?.eta_hours || null,
        };
      });

    // Calculate statistics
    const pendingCount = requests.filter((r: any) => !r.my_quote_status).length;
    const respondedCount = requests.filter((r: any) => r.my_quote_status).length;

    // Fetch completion rate from jobs
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('technician_id', user.id)
      .in('status', ['completed', 'cancelled'])
      .limit(100);

    const completedJobs = (jobsData || []).filter((j: any) => j.status === 'completed').length;
    const totalJobs = (jobsData || []).length;
    const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    // Fetch rating
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('technician_id', user.id);

    const reviewsArray = reviewsData || [];
    const averageRating = reviewsArray.length > 0
      ? (reviewsArray.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviewsArray.length)
      : null;

    const payload = {
      requests,
      technician: {
        id: profileData.id,
        full_name: profileData.full_name,
        phone: profileData.phone,
        city: profileData.city,
        within_working_hours: withinWorkingHours,
        working_hours_label: workingHoursLabel,
        service_lat: profileData.service_lat,
        service_lng: profileData.service_lng,
      },
      stats: {
        pending_count: pendingCount,
        responded_count: respondedCount,
        total_visible: requests.length,
        completion_rate: completionRate,
        average_rating: averageRating,
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/tecnico/dashboard]', error);
    const message = String(error?.message || '');
    if (message === supabaseConfigError || message === supabaseServerConfigError) {
      return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
    }
    if (message.includes('token')) {
      return NextResponse.json({ error: 'Sesion requerida.' }, { status: 401 });
    }

    return NextResponse.json(
      { error: message || 'No se pudo cargar el dashboard.' },
      { status: 500 }
    );
  }
}

// Helper functions (same as in mobile API)
const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

const parseWorkingHoursConfig = (config: any) => {
  if (!config || typeof config !== 'object') return null;
  return {
    monday_start: config.monday_start || null,
    monday_end: config.monday_end || null,
    tuesday_start: config.tuesday_start || null,
    tuesday_end: config.tuesday_end || null,
    wednesday_start: config.wednesday_start || null,
    wednesday_end: config.wednesday_end || null,
    thursday_start: config.thursday_start || null,
    thursday_end: config.thursday_end || null,
    friday_start: config.friday_start || null,
    friday_end: config.friday_end || null,
    saturday_start: config.saturday_start || null,
    saturday_end: config.saturday_end || null,
    sunday_start: config.sunday_start || null,
    sunday_end: config.sunday_end || null,
  };
};

const formatWorkingHoursLabel = (config: any) => {
  const parsed = parseWorkingHoursConfig(config);
  if (!parsed) return null;

  const daysOfWeek = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];
  const dayKeys = [
    ['monday_start', 'monday_end'],
    ['tuesday_start', 'tuesday_end'],
    ['wednesday_start', 'wednesday_end'],
    ['thursday_start', 'thursday_end'],
    ['friday_start', 'friday_end'],
    ['saturday_start', 'saturday_end'],
    ['sunday_start', 'sunday_end'],
  ];

  const dayLabels = dayKeys
    .map((keys, idx) => {
      const start = (parsed as any)[keys[0]];
      const end = (parsed as any)[keys[1]];
      if (!start || !end) return null;
      return `${daysOfWeek[idx]}: ${start}-${end}`;
    })
    .filter(Boolean);

  return dayLabels.length > 0 ? dayLabels.join(', ') : null;
};

const isNowWithinWorkingHours = (config: any) => {
  const parsed = parseWorkingHoursConfig(config);
  if (!parsed) return true;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ARGENTINA_TIMEZONE,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const dayName = (parts.find((p) => p.type === 'weekday')?.value || 'monday').toLowerCase();
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;
  const currentTime = `${hour}:${minute}`;

  const dayMap: { [key: string]: [string, string] } = {
    monday: ['monday_start', 'monday_end'],
    tuesday: ['tuesday_start', 'tuesday_end'],
    wednesday: ['wednesday_start', 'wednesday_end'],
    thursday: ['thursday_start', 'thursday_end'],
    friday: ['friday_start', 'friday_end'],
    saturday: ['saturday_start', 'saturday_end'],
    sunday: ['sunday_start', 'sunday_end'],
  };

  const [startKey, endKey] = dayMap[dayName] || ['', ''];
  const startTime = (parsed as any)[startKey];
  const endTime = (parsed as any)[endKey];

  if (!startTime || !endTime) return false;

  return currentTime >= startTime && currentTime <= endTime;
};
