import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import { GoogleAuth } from 'google-auth-library';

const getServiceAccount = () => {
  const rawJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  const b64 = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_B64;
  if (rawJson) return JSON.parse(rawJson);
  if (b64) {
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }
  return null;
};

const packageName =
  process.env.GOOGLE_PLAY_PACKAGE_NAME || process.env.ANDROID_PACKAGE || 'com.urbanfix.app';

const getAccessToken = async () => {
  const credentials = getServiceAccount();
  if (!credentials) {
    throw new Error('Falta GOOGLE_PLAY_SERVICE_ACCOUNT_B64 o GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  }
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/playdeveloperreporting'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token || !token.token) {
    throw new Error('No se pudo obtener token de Google Play');
  }
  return token.token;
};

const toNumber = (value: any) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof value === 'object') {
    return Number(
      value.doubleValue ?? value.int64Value ?? value.decimalValue ?? value.floatValue ?? 0
    );
  }
  return 0;
};

const parseSeries = (rows: any[] = [], metrics: string[]) =>
  rows.map((row) => {
    const date =
      row.dimensionValues?.[0]?.stringValue ||
      row.dimensionValues?.[0]?.value ||
      row.dimensionValues?.[0]?.day ||
      '';
    const entry: Record<string, any> = { date };
    metrics.forEach((metric, index) => {
      entry[metric] = toNumber(row.metricValues?.[index]);
    });
    return entry;
  });

const queryMetricSet = async ({
  token,
  metricSet,
  metrics,
  days = 14,
}: {
  token: string;
  metricSet: string;
  metrics: string[];
  days?: number;
}) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  const body = {
    dimensions: ['day'],
    metrics,
    timelineSpec: {
      aggregationPeriod: 'DAILY',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  };

  const response = await fetch(
    `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${packageName}/${metricSet}:query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${metricSet}: ${response.status} ${text}`);
  }

  return response.json();
};

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const token = await getAccessToken();
    const errors: string[] = [];

    let installs: any = null;
    try {
      const installsRes = await queryMetricSet({
        token,
        metricSet: 'statistics',
        metrics: ['dailyUserInstalls', 'dailyUserUninstalls', 'dailyDeviceInstalls'],
        days: 14,
      });
      const series = parseSeries(installsRes.rows, [
        'dailyUserInstalls',
        'dailyUserUninstalls',
        'dailyDeviceInstalls',
      ]);
      installs = {
        series,
        totalUserInstalls: series.reduce((sum, item) => sum + toNumber(item.dailyUserInstalls), 0),
        totalUserUninstalls: series.reduce(
          (sum, item) => sum + toNumber(item.dailyUserUninstalls),
          0
        ),
      };
    } catch (error: any) {
      errors.push(error?.message || 'No se pudieron obtener instalaciones');
    }

    let crashes: any = null;
    try {
      const crashRes = await queryMetricSet({
        token,
        metricSet: 'crashRateMetricSet',
        metrics: ['crashRate', 'crashRate7dUserWeighted', 'crashRate28dUserWeighted'],
        days: 14,
      });
      const series = parseSeries(crashRes.rows, [
        'crashRate',
        'crashRate7dUserWeighted',
        'crashRate28dUserWeighted',
      ]);
      const latest = series[series.length - 1];
      crashes = {
        series,
        crashRate: toNumber(latest?.crashRate),
        crashRate7d: toNumber(latest?.crashRate7dUserWeighted),
        crashRate28d: toNumber(latest?.crashRate28dUserWeighted),
        lastDate: latest?.date || null,
      };
    } catch (error: any) {
      errors.push(error?.message || 'No se pudieron obtener crashes');
    }

    let anr: any = null;
    try {
      const anrRes = await queryMetricSet({
        token,
        metricSet: 'anrRateMetricSet',
        metrics: ['anrRate', 'anrRate7dUserWeighted', 'anrRate28dUserWeighted'],
        days: 14,
      });
      const series = parseSeries(anrRes.rows, [
        'anrRate',
        'anrRate7dUserWeighted',
        'anrRate28dUserWeighted',
      ]);
      const latest = series[series.length - 1];
      anr = {
        series,
        anrRate: toNumber(latest?.anrRate),
        anrRate7d: toNumber(latest?.anrRate7dUserWeighted),
        anrRate28d: toNumber(latest?.anrRate28dUserWeighted),
        lastDate: latest?.date || null,
      };
    } catch (error: any) {
      errors.push(error?.message || 'No se pudieron obtener ANR');
    }

    return NextResponse.json({
      range: {
        start: new Date(Date.now() - 13 * 86400000).toISOString(),
        end: new Date().toISOString(),
        days: 14,
      },
      installs,
      crashes,
      anr,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No se pudo consultar Play' }, { status: 500 });
  }
}
