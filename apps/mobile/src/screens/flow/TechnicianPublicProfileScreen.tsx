import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import PublicTechnicianProfileView from '../../components/organisms/PublicTechnicianProfileView';
import { ScreenHeader } from '../../components/molecules/ScreenHeader';
import { supabase } from '../../lib/supabase';
import { ClientTechnicianProfile } from '../../api/client';
import {
  TechnicianPublicProfileStatusPayload,
  TechnicianPublicProfileStatusSummary,
  fetchTechnicianPublicProfileStatus,
} from '../../api/marketplace';
import { COLORS, FONTS } from '../../utils/theme';

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

export default function TechnicianPublicProfileScreen() {
  const [technicianId, setTechnicianId] = useState('');
  const [shareProfileId, setShareProfileId] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [technicianFallback, setTechnicianFallback] = useState<Partial<ClientTechnicianProfile> | null>(null);
  const [shareUnavailableReason, setShareUnavailableReason] = useState(
    'No pudimos identificar un link publico para compartir desde esta cuenta.'
  );
  const [previewNote, setPreviewNote] = useState(
    'Esta es la ficha publica que aparece en la vidriera comercial para clientes.'
  );

  const getProfileLabel = (profile: TechnicianPublicProfileStatusSummary | null) =>
    profile?.business_name || profile?.full_name || 'tu cuenta actual';

  const buildPreviewNote = (payload: TechnicianPublicProfileStatusPayload) => {
    const currentLabel = getProfileLabel(payload.currentProfile);
    const previewLabel = getProfileLabel(payload.previewProfile);

    if (payload.reason === 'duplicate_unpublished_account' && payload.previewProfile) {
      const jobsLabel =
        payload.previewProfile.completed_jobs_total > 0
          ? ` (${payload.previewProfile.completed_jobs_total} trabajos cerrados)`
          : '';
      return `Esta sesion pertenece a una cuenta secundaria no publicada. Para evitar confusion, UrbanFix te muestra la ficha publica activa de ${previewLabel}${jobsLabel}. Si queres editar esa ficha, inicia sesion con la cuenta que la publico.`;
    }

    if (payload.reason === 'unpublished_profile') {
      return `La cuenta ${currentLabel} todavia no esta publicada en la vidriera comercial. Esta vista sirve como referencia interna hasta que se publique el perfil correcto.`;
    }

    return 'Esta es la ficha publica que aparece en la vidriera comercial para clientes.';
  };

  const loadCurrentProfileSnapshot = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user?.id) {
      throw new Error('Sesion expirada. Inicia sesion nuevamente.');
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select(
        'id, full_name, business_name, phone, city, specialties, company_address, coverage_area, company_logo_url, avatar_url, public_rating, public_reviews_count, completed_jobs_total, references_summary, client_recommendations, achievement_badges, instagram_profile_url, facebook_profile_url, instagram_post_url, facebook_post_url, work_photo_urls'
      )
      .eq('id', user.id)
      .maybeSingle();

    return {
      userId: user.id,
      snapshot: profileData
        ? ({
            id: String((profileData as any).id || user.id),
            name: String((profileData as any).business_name || (profileData as any).full_name || 'Tecnico UrbanFix'),
            business_name: String((profileData as any).business_name || '').trim() || null,
            full_name: String((profileData as any).full_name || '').trim() || null,
            phone: String((profileData as any).phone || '').trim() || null,
            city: String((profileData as any).city || '').trim() || 'Argentina',
            specialty: String((profileData as any).specialties || '').trim() || 'Servicios generales',
            address:
              String((profileData as any).company_address || '').trim() ||
              String((profileData as any).coverage_area || '').trim() ||
              String((profileData as any).city || '').trim() ||
              'Cobertura no informada',
            coverage_area: String((profileData as any).coverage_area || '').trim() || null,
            company_logo_url: String((profileData as any).company_logo_url || '').trim() || null,
            avatar_url: String((profileData as any).avatar_url || '').trim() || null,
            rating: Number.isFinite(Number((profileData as any).public_rating))
              ? Number((profileData as any).public_rating)
              : null,
            public_reviews_count: Math.max(0, Number((profileData as any).public_reviews_count || 0)),
            completed_jobs_total: Math.max(0, Number((profileData as any).completed_jobs_total || 0)),
            references_summary: String((profileData as any).references_summary || '').trim() || null,
            client_recommendations: String((profileData as any).client_recommendations || '').trim() || null,
            achievement_badges: Array.isArray((profileData as any).achievement_badges)
              ? (profileData as any).achievement_badges.map((item: unknown) => String(item || '').trim()).filter(Boolean)
              : [],
            instagram_profile_url: String((profileData as any).instagram_profile_url || '').trim() || null,
            facebook_profile_url: String((profileData as any).facebook_profile_url || '').trim() || null,
            instagram_post_url: String((profileData as any).instagram_post_url || '').trim() || null,
            facebook_post_url: String((profileData as any).facebook_post_url || '').trim() || null,
            work_photo_urls: Array.isArray((profileData as any).work_photo_urls)
              ? (profileData as any).work_photo_urls.map((item: unknown) => String(item || '').trim()).filter(Boolean)
              : [],
          } as Partial<ClientTechnicianProfile>)
        : null,
    };
  };

  const loadFallbackCurrentAccount = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user?.id) {
      throw new Error('Sesion expirada. Inicia sesion nuevamente.');
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, business_name, profile_published, completed_jobs_total')
      .eq('id', user.id)
      .maybeSingle();

    const profilePublished = Boolean((profileData as any)?.profile_published);
    const profileLabel =
      String((profileData as any)?.business_name || (profileData as any)?.full_name || '').trim() || 'tu cuenta actual';
    const completedJobs = Math.max(0, Number((profileData as any)?.completed_jobs_total || 0));

    return {
      technicianId: user.id,
      shareProfileId: profilePublished ? user.id : '',
      previewNote: profilePublished
        ? 'Esta es la ficha publica asociada a la cuenta con sesion activa.'
        : completedJobs > 0
          ? `No pudimos resolver el perfil comercial publicado desde este entorno. Mostramos tu cuenta actual (${profileLabel}) con ${completedJobs} trabajos cerrados cargados.`
          : `No pudimos resolver el perfil comercial publicado desde este entorno. Mostramos tu cuenta actual (${profileLabel}). Si ves diferencias, revisa que Expo apunte al backend web correcto.`,
      shareUnavailableReason: profilePublished
        ? ''
        : 'Esta cuenta no tiene un perfil publico publicado resoluble desde el entorno actual.',
    };
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadCurrentTechnician = async () => {
        setLoading(true);
        setErrorMessage('');
        setTechnicianFallback(null);
        setShareProfileId('');
        setShareUnavailableReason('No pudimos identificar un link publico para compartir desde esta cuenta.');

        try {
          const [status, currentProfile] = await Promise.all([
            fetchTechnicianPublicProfileStatus(),
            loadCurrentProfileSnapshot(),
          ]);
          const previewProfileId = String(status.previewProfile?.id || '').trim();

          if (!previewProfileId) {
            throw new Error('No pudimos identificar que perfil mostrar en tu vista publica.');
          }

          if (!active) return;
          setTechnicianId(previewProfileId);
          setShareProfileId(previewProfileId);
          setTechnicianFallback(currentProfile.userId === previewProfileId ? currentProfile.snapshot : null);
          setShareUnavailableReason('');
          setPreviewNote(buildPreviewNote(status));
        } catch (error) {
          try {
            const [fallback, currentProfile] = await Promise.all([
              loadFallbackCurrentAccount(),
              loadCurrentProfileSnapshot(),
            ]);
            if (!active) return;
            setTechnicianId(fallback.technicianId);
            setShareProfileId(fallback.shareProfileId);
            setTechnicianFallback(currentProfile.userId === fallback.technicianId ? currentProfile.snapshot : null);
            setPreviewNote(fallback.previewNote);
            setShareUnavailableReason(fallback.shareUnavailableReason);
            setErrorMessage('');
          } catch (fallbackError) {
            if (!active) return;
            setTechnicianId('');
            setShareProfileId('');
            setTechnicianFallback(null);
            setErrorMessage(toErrorMessage(fallbackError, 'No pudimos identificar tu perfil publico.'));
            setPreviewNote('Esta es la ficha publica que aparece en la vidriera comercial para clientes.');
            setShareUnavailableReason('No pudimos identificar un link publico para compartir desde esta cuenta.');
          }
        } finally {
          if (active) setLoading(false);
        }
      };

      void loadCurrentTechnician();

      return () => {
        active = false;
      };
    }, [])
  );

  if (loading && !technicianId) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Perfil publico" subtitle="Vista previa en vidriera" showBack />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Preparando tu perfil publico...</Text>
        </View>
      </View>
    );
  }

  if (!technicianId) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Perfil publico" subtitle="Vista previa en vidriera" showBack />
        <View style={styles.center}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
            <Text style={styles.errorText}>{errorMessage || 'No pudimos abrir tu perfil publico.'}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <PublicTechnicianProfileView
      technicianId={technicianId}
      headerTitle="Perfil publico"
      headerSubtitle="Vista previa comercial"
      heroEyebrow="Asi te ven los clientes"
      previewNote={previewNote}
      loadingMessage="Cargando tu perfil publico..."
      emptyMessage="Todavia no pudimos armar tu perfil publico."
      technicianFallback={technicianFallback}
      shareProfileId={shareProfileId}
      shareUnavailableReason={shareUnavailableReason}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  loadingText: {
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  errorCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.body,
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 19,
  },
});
