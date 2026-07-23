'use client';

import Link from 'next/link';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Circle as LeafletCircle, LayerGroup, Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import {
  USER_COUNTRY_CHANGED_EVENT,
  getStoredCountryPreference,
} from '../../lib/country-preference';
import { DEFAULT_COUNTRY_NAME } from '../../lib/location-catalog';
import { getCountryMapFocus } from '../../lib/map-country-focus';
import { addMalvinasArgentinaLabel } from '../../lib/map-overlays';
import { hasSupabaseConfig, supabase } from '../../lib/supabase/supabase';

export type PublicTechnicianMapPoint = {
  id: string;
  name: string;
  ownerName?: string;
  profileHref: string;
  whatsappHref: string;
  city: string;
  coverageArea: string;
  profileSummary?: string;
  socialLabels?: string[];
  specialties: string[];
  lat: number;
  lng: number;
  radiusKm: number;
  precision: 'exact' | 'approx';
  openNow: boolean;
  availabilityStatus?: 'open' | 'closed' | 'unspecified';
  workingHoursLabel: string;
  likesCount: number;
  rating: number | null;
  reviewsCount: number;
  commentsCount?: number;
  completedJobsTotal: number;
  avatarUrl: string;
  companyLogoUrl: string;
};

export type PublicTechniciansMapQuickLink = {
  label: string;
  href: string;
};

export type PublicTechniciansMapSearchConfig = {
  actionHref: string;
  clearHref: string;
  query: string;
  options: string[];
  rubroValue?: string;
  rubroOptions?: Array<{ label: string; value: string }>;
  rubroPlaceholder?: string;
  rubroFieldName?: string;
  hiddenFields?: Array<{ name: string; value: string }>;
  resultLabel: string;
  listAnchorId?: string;
  listLabel?: string;
  placeholder?: string;
  quickLinks?: PublicTechniciansMapQuickLink[];
};

type Props = {
  points: PublicTechnicianMapPoint[];
  preferUserLocation?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  searchConfig?: PublicTechniciansMapSearchConfig;
  fullBleed?: boolean;
  selectedCountry?: string;
};

type DisplayPoint = PublicTechnicianMapPoint & {
  mapLat: number;
  mapLng: number;
};

const ARGENTINA_CENTER: [number, number] = [-38.4, -63.6];
const ARGENTINA_DEFAULT_ZOOM = 4.2;
const USER_LOCATION_DEFAULT_ZOOM = 14;
const USER_LOCATION_CLOSE_ZOOM = 15;
const USER_LOCATION_COARSE_ZOOM = 13;
const defaultPlaceholder = 'Ingresa ciudades o barrios';
const MAP_PROFILE_SETUP_PATH = '/tecnicos?tab=perfil&perfil=tecnico#perfil-publicacion';
const MAP_PROFILE_SETUP_AUTH_HREF = `/tecnicos?perfil=tecnico&mode=login&next=${encodeURIComponent(MAP_PROFILE_SETUP_PATH)}`;

const formatCompactNumber = (value: number) => value.toLocaleString('es-AR');

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildMarkerHtml = (point: DisplayPoint, selected: boolean) => {
  const availabilityStatus = point.availabilityStatus || (point.openNow ? 'open' : 'closed');
  const badge = availabilityStatus === 'open' ? 'Disponible' : availabilityStatus === 'closed' ? 'Fuera' : 'Consultar';
  return `
    <div class="ufx-map-pin ${availabilityStatus === 'open' ? 'is-open' : availabilityStatus === 'closed' ? 'is-closed' : 'is-unspecified'} ${selected ? 'is-selected' : ''}">
      <div class="ufx-map-pin-core"></div>
      <div class="ufx-map-pin-glow"></div>
      <span class="ufx-map-pin-badge">${badge}</span>
    </div>
  `;
};

const buildTooltipHtml = (point: DisplayPoint) => {
  const precisionLabel = point.precision === 'exact' ? 'Punto verificado' : 'Zona estimada';
  const precisionClass = point.precision === 'exact' ? 'is-exact' : 'is-approx';
  return `
    <div class="ufx-map-tooltip-card ${precisionClass}">
      <div class="ufx-map-tooltip-head">
        <span class="ufx-map-tooltip-dot"></span>
        <p class="ufx-map-tooltip-title">${escapeHtml(point.name)}</p>
      </div>
      <p class="ufx-map-tooltip-meta">${escapeHtml(point.city || point.coverageArea || 'UrbanFix')}</p>
      <p class="ufx-map-tooltip-subtle">${escapeHtml(precisionLabel)}</p>
    </div>
  `;
};

const spreadOverlappingPoints = (points: PublicTechnicianMapPoint[]): DisplayPoint[] => {
  const grouped = new Map<string, PublicTechnicianMapPoint[]>();

  points.forEach((point) => {
    const key = `${point.lat.toFixed(3)}:${point.lng.toFixed(3)}`;
    const current = grouped.get(key) || [];
    current.push(point);
    grouped.set(key, current);
  });

  return points.map((point) => {
    const key = `${point.lat.toFixed(3)}:${point.lng.toFixed(3)}`;
    const siblings = grouped.get(key) || [point];
    const index = siblings.findIndex((candidate) => candidate.id === point.id);
    if (siblings.length <= 1 || index < 0) {
      return {
        ...point,
        mapLat: point.lat,
        mapLng: point.lng,
      };
    }

    const ring = Math.floor(index / 6);
    const slot = index % 6;
    const angle = (Math.PI * 2 * slot) / 6;
    const baseOffset = point.precision === 'exact' ? 0.004 : 0.009;
    const distance = baseOffset + ring * baseOffset * 0.6;

    return {
      ...point,
      mapLat: point.lat + Math.sin(angle) * distance,
      mapLng: point.lng + Math.cos(angle) * distance,
    };
  });
};

const getSelectedMedia = (point: PublicTechnicianMapPoint) => point.avatarUrl || point.companyLogoUrl || '';

const getUserLocationFocusZoom = (accuracyMeters: number | null) => {
  if (!accuracyMeters) return USER_LOCATION_DEFAULT_ZOOM;
  if (accuracyMeters <= 250) return USER_LOCATION_CLOSE_ZOOM;
  if (accuracyMeters <= 1200) return USER_LOCATION_DEFAULT_ZOOM;
  return USER_LOCATION_COARSE_ZOOM;
};

type UserLocationState =
  | { status: 'idle' | 'requesting' | 'unsupported' | 'denied' | 'error'; lat: null; lng: null; accuracyMeters: null }
  | { status: 'ready'; lat: number; lng: number; accuracyMeters: number | null };

type CurrentProfileMapStatus = {
  access_granted?: boolean | null;
  profile_published?: boolean | null;
  service_lat?: number | string | null;
  service_lng?: number | string | null;
};

const hasEnabledMapProfile = (profile: CurrentProfileMapStatus | null | undefined) =>
  profile?.access_granted === true &&
  profile?.profile_published === true &&
  Number.isFinite(Number(profile.service_lat)) &&
  Number.isFinite(Number(profile.service_lng));

export default function PublicTechniciansMap({
  points,
  preferUserLocation = true,
  eyebrow: _eyebrow,
  title: _title,
  description: _description,
  searchConfig,
  fullBleed = false,
  selectedCountry = DEFAULT_COUNTRY_NAME,
}: Props) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);
  const userAccuracyCircleRef = useRef<LeafletCircle | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const isMountedRef = useRef(true);
  const shouldRecenterSelectionRef = useRef(false);
  const shouldPreserveViewportRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasRequestedUserFocus, setHasRequestedUserFocus] = useState(preferUserLocation);
  const [showMapSignupCta, setShowMapSignupCta] = useState(!hasSupabaseConfig);
  const [activeCountry, setActiveCountry] = useState(selectedCountry || DEFAULT_COUNTRY_NAME);
  const [userLocation, setUserLocation] = useState<UserLocationState>({
    status: preferUserLocation ? 'requesting' : 'idle',
    lat: null,
    lng: null,
    accuracyMeters: null,
  });
  const zonesListId = useId().replace(/:/g, '');

  const displayPoints = useMemo(() => spreadOverlappingPoints(points), [points]);
  const countryFocus = useMemo(() => getCountryMapFocus(activeCountry), [activeCountry]);
  const hasSearchFilters = Boolean(
    searchConfig?.query || searchConfig?.rubroValue || searchConfig?.hiddenFields?.some((field) => field.value)
  );
  const selectedPoint = useMemo(
    () => displayPoints.find((point) => point.id === selectedId) || null,
    [displayPoints, selectedId]
  );
  const shouldFocusUserLocation = preferUserLocation || hasRequestedUserFocus;

  const focusMapOnUserLocation = (lat: number, lng: number, accuracyMeters: number | null, animate = true) => {
    const map = mapRef.current;
    if (!map) return;

    map.setView([lat, lng], getUserLocationFocusZoom(accuracyMeters), { animate });
  };

  useEffect(() => {
    setActiveCountry(getStoredCountryPreference() || selectedCountry || DEFAULT_COUNTRY_NAME);
  }, [selectedCountry]);

  useEffect(() => {
    let cancelled = false;

    if (!hasSupabaseConfig) {
      setShowMapSignupCta(true);
      return;
    }

    const applySession = async (nextSession: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      const user = nextSession?.user || null;

      if (!user) {
        if (!cancelled) setShowMapSignupCta(true);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('access_granted,profile_published,service_lat,service_lng')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;
      setShowMapSignupCta(Boolean(error) || !hasEnabledMapProfile(data as CurrentProfileMapStatus | null));
    };

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncCountry = (event?: Event) => {
      const nextCountry =
        event instanceof CustomEvent && typeof event.detail?.country === 'string'
          ? event.detail.country
          : getStoredCountryPreference();
      setActiveCountry(nextCountry || selectedCountry || DEFAULT_COUNTRY_NAME);
    };

    window.addEventListener('storage', syncCountry);
    window.addEventListener(USER_COUNTRY_CHANGED_EVENT, syncCountry);

    return () => {
      window.removeEventListener('storage', syncCountry);
      window.removeEventListener(USER_COUNTRY_CHANGED_EVENT, syncCountry);
    };
  }, [selectedCountry]);

  const requestUserLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUserLocation({
        status: 'unsupported',
        lat: null,
        lng: null,
        accuracyMeters: null,
      });
      return;
    }

    setUserLocation({
      status: 'requesting',
      lat: null,
      lng: null,
      accuracyMeters: null,
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) return;

        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        };

        focusMapOnUserLocation(nextLocation.lat, nextLocation.lng, nextLocation.accuracyMeters);
        setUserLocation({
          status: 'ready',
          ...nextLocation,
        });
      },
      (error) => {
        if (!isMountedRef.current) return;

        setUserLocation({
          status: error.code === 1 ? 'denied' : 'error',
          lat: null,
          lng: null,
          accuracyMeters: null,
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5 * 60 * 1000,
        timeout: 10 * 1000,
      }
    );
  };

  const selectPoint = (pointId: string) => {
    shouldRecenterSelectionRef.current = true;
    setSelectedId(pointId);
  };

  const closeSelectedPoint = () => {
    shouldPreserveViewportRef.current = true;
    shouldRecenterSelectionRef.current = false;
    setSelectedId(null);
  };

  useEffect(() => {
    setSelectedId((current) => {
      if (current && points.some((point) => point.id === current)) return current;
      return null;
    });
  }, [points]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!preferUserLocation) {
      setUserLocation((current) => (current.status === 'idle' ? current : { status: 'idle', lat: null, lng: null, accuracyMeters: null }));
      return;
    }

    requestUserLocation();
  }, [preferUserLocation]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const initMap = async () => {
      if (!mapHostRef.current || mapRef.current) return;
      const hostRect = mapHostRef.current.getBoundingClientRect();
      if (hostRect.width < 10 || hostRect.height < 10) {
        window.setTimeout(initMap, 80);
        return;
      }
      const L = await import('leaflet');
      if (cancelled || !mapHostRef.current) return;

      leafletRef.current = L;

      const map = L.map(mapHostRef.current, {
        center: ARGENTINA_CENTER,
        zoom: ARGENTINA_DEFAULT_ZOOM,
        zoomControl: false,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: false,
      });

      map.attributionControl.setPosition('bottomleft');
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      addMalvinasArgentinaLabel(L, map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize(false);
        });
        resizeObserver.observe(mapHostRef.current);
      }
      window.requestAnimationFrame(() => map.invalidateSize(false));
      [120, 360, 800].forEach((delay) => {
        window.setTimeout(() => {
          if (!cancelled) map.invalidateSize(false);
        }, delay);
      });
    };

    initMap();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      circleRef.current = null;
      userAccuracyCircleRef.current = null;
      userMarkerRef.current = null;
      markersLayerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !leafletRef.current || !mapRef.current || !markersLayerRef.current) return;

    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    displayPoints.forEach((point) => {
      const marker = L.marker([point.mapLat, point.mapLng], {
        icon: L.divIcon({
          html: buildMarkerHtml(point, point.id === selectedId),
          className: 'ufx-map-pin-shell',
          iconSize: [42, 54],
          iconAnchor: [21, 42],
          tooltipAnchor: [0, -26],
        }),
        title: point.name,
      });

      marker.bindTooltip(buildTooltipHtml(point), {
        direction: 'top',
        opacity: 1,
        className: 'ufx-map-tooltip',
      });

      marker.on('click', () => {
        selectPoint(point.id);
      });

      marker.addTo(layer);
    });

    if (shouldPreserveViewportRef.current || shouldRecenterSelectionRef.current) {
      shouldPreserveViewportRef.current = false;
      shouldRecenterSelectionRef.current = false;
      return;
    }

    if (displayPoints.length === 0) {
      if (shouldFocusUserLocation && userLocation.status === 'ready') {
        map.setView([userLocation.lat, userLocation.lng], getUserLocationFocusZoom(userLocation.accuracyMeters), {
          animate: false,
        });
        return;
      }
      if (countryFocus) {
        map.setView(countryFocus.center, countryFocus.zoom, { animate: false });
        return;
      }
      map.setView(ARGENTINA_CENTER, ARGENTINA_DEFAULT_ZOOM);
      return;
    }

    if (shouldFocusUserLocation && userLocation.status === 'ready') {
      map.setView([userLocation.lat, userLocation.lng], getUserLocationFocusZoom(userLocation.accuracyMeters), {
        animate: true,
      });
      return;
    }

    if (countryFocus && !hasSearchFilters) {
      map.setView(countryFocus.center, countryFocus.zoom, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(displayPoints.map((point) => [point.mapLat, point.mapLng] as [number, number]));
    map.fitBounds(bounds.pad(0.14), {
      maxZoom: displayPoints.length === 1 ? 12 : 8,
      animate: false,
    });
  }, [countryFocus, displayPoints, hasSearchFilters, mapReady, selectedId, shouldFocusUserLocation, userLocation]);

  useEffect(() => {
    if (!mapReady || !leafletRef.current || !mapRef.current) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    userAccuracyCircleRef.current?.remove();
    userAccuracyCircleRef.current = null;

    if (userLocation.status !== 'ready') return;

    const L = leafletRef.current;
    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon: L.divIcon({
        html: `
          <div class="ufx-map-user-pin">
            <span class="ufx-map-user-pin-core"></span>
            <span class="ufx-map-user-pin-pulse"></span>
          </div>
        `,
        className: 'ufx-map-user-pin-shell',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
      title: 'Tu ubicacion',
    }).addTo(mapRef.current);

    if (userLocation.accuracyMeters) {
      userAccuracyCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
        radius: Math.max(80, Math.min(userLocation.accuracyMeters, 1500)),
        color: '#5eead4',
        weight: 1,
        opacity: 0.9,
        fillColor: '#2dd4bf',
        fillOpacity: 0.08,
      }).addTo(mapRef.current);
    }
  }, [mapReady, userLocation]);

  useEffect(() => {
    if (!mapReady || !leafletRef.current || !mapRef.current) return;

    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    if (!selectedPoint) return;

    const availabilityStatus = selectedPoint.availabilityStatus || (selectedPoint.openNow ? 'open' : 'closed');

    circleRef.current = leafletRef.current.circle([selectedPoint.mapLat, selectedPoint.mapLng], {
      radius: Math.max(1000, selectedPoint.radiusKm * 1000),
      color: availabilityStatus === 'open' ? '#ff9b30' : availabilityStatus === 'closed' ? '#7c3aed' : '#94a3b8',
      weight: 1.5,
      opacity: 0.9,
      fillColor: availabilityStatus === 'open' ? '#ff9b30' : availabilityStatus === 'closed' ? '#7c3aed' : '#94a3b8',
      fillOpacity: 0.12,
      dashArray: selectedPoint.precision === 'approx' ? '8 8' : undefined,
    }).addTo(mapRef.current);
  }, [mapReady, selectedPoint]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedPoint || !shouldRecenterSelectionRef.current) return;

    shouldRecenterSelectionRef.current = false;
    mapRef.current.flyTo(
      [selectedPoint.mapLat, selectedPoint.mapLng],
      Math.max(mapRef.current.getZoom(), selectedPoint.precision === 'exact' ? 11 : 10),
      {
        animate: true,
        duration: 0.55,
      }
    );
  }, [mapReady, selectedPoint]);

  if (points.length === 0) {
    return null;
  }

  const listHref = searchConfig?.listAnchorId ? `#${searchConfig.listAnchorId}` : null;
  const selectedRating = Number(selectedPoint?.rating || 0);
  const selectedAvailabilityStatus = selectedPoint
    ? selectedPoint.availabilityStatus || (selectedPoint.openNow ? 'open' : 'closed')
    : 'unspecified';
  const selectedAvailabilityLabel =
    selectedAvailabilityStatus === 'open'
      ? 'Disponible ahora'
      : selectedAvailabilityStatus === 'closed'
        ? 'Fuera de horario'
        : 'Disponibilidad a coordinar';
  const selectedAvailabilityClass =
    selectedAvailabilityStatus === 'open'
      ? 'border-emerald-300/28 bg-emerald-400/10 text-emerald-100'
      : selectedAvailabilityStatus === 'closed'
        ? 'border-violet-300/28 bg-violet-400/10 text-violet-100'
        : 'border-slate-300/28 bg-slate-400/10 text-slate-100';
  const selectedSpecialties = selectedPoint?.specialties.slice(0, 5) || [];
  const selectedProfileSummary = String(selectedPoint?.profileSummary || '').trim();
  const selectedOwnerName = String(selectedPoint?.ownerName || '').trim();
  const selectedSocialLabels = selectedPoint?.socialLabels?.filter(Boolean) || [];
  const selectedZoneLabel = selectedPoint?.city || selectedPoint?.coverageArea || '';
  const selectedCommentsCount = Math.max(0, Number(selectedPoint?.commentsCount || 0));

  return (
    <section
      className={
        fullBleed
          ? 'h-[calc(100dvh-57px)] min-h-[calc(100dvh-57px)] overflow-hidden bg-[#12001c]'
          : 'mt-6 overflow-visible rounded-[36px] border border-white/15 bg-[#12001c] shadow-[0_40px_110px_-65px_rgba(0,0,0,0.92)]'
      }
    >
      {(!fullBleed || searchConfig) && (
        <div className="sticky top-[57px] z-[650] border-b border-white/12 bg-[#190426]/96 px-2.5 py-2.5 shadow-[0_18px_45px_-34px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:px-4 lg:px-6">
          <div className="mx-auto w-full max-w-[1500px]">
            {searchConfig ? (
            <form
              method="get"
              action={searchConfig.actionHref}
              className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(170px,260px)_auto_auto_auto] xl:grid-cols-[minmax(0,1fr)_minmax(190px,280px)_auto_auto_auto]"
            >
              {searchConfig.hiddenFields?.map((field) => (
                <input key={`${field.name}-${field.value}`} type="hidden" name={field.name} value={field.value} />
              ))}

              <div className="col-span-2 min-w-0 lg:col-span-1">
                <input
                  id="vidriera-zona"
                  type="text"
                  name="zona"
                  defaultValue={searchConfig.query}
                  list={zonesListId}
                  placeholder={searchConfig.placeholder || defaultPlaceholder}
                  className="h-10 sm:h-12 w-full rounded-[18px] sm:rounded-[20px] border border-white/18 bg-black/25 px-3 sm:px-4 text-xs sm:text-sm text-white placeholder:text-white/45 outline-none transition focus:border-[#ff8f1f] focus:bg-black/34"
                />
                <datalist id={zonesListId}>
                  {searchConfig.options.map((zone) => (
                    <option key={`zona-${zone}`} value={zone} />
                  ))}
                </datalist>
              </div>

              {searchConfig.rubroOptions?.length ? (
                <div className="col-span-2 min-w-0 sm:col-span-1 lg:col-span-1">
                  <select
                    name={searchConfig.rubroFieldName || 'gremio'}
                    defaultValue={searchConfig.rubroValue || ''}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                    aria-label="Filtrar por rubro"
                    className="h-10 w-full rounded-[18px] border border-white/18 bg-black/25 px-3 text-xs font-semibold text-white outline-none transition focus:border-[#ff8f1f] focus:bg-black/34 sm:h-12 sm:rounded-[20px] sm:px-4 sm:text-sm"
                  >
                    <option value="" className="bg-[#190426] text-white">
                      {searchConfig.rubroPlaceholder || 'Todos los rubros'}
                    </option>
                    {searchConfig.rubroOptions.map((rubro) => (
                      <option key={`rubro-${rubro.value}`} value={rubro.value} className="bg-[#190426] text-white">
                        {rubro.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setHasRequestedUserFocus(true);
                  requestUserLocation();
                }}
                className="h-10 whitespace-nowrap rounded-[18px] border border-[#5eead4]/42 bg-[#5eead4]/10 px-3 text-xs font-semibold text-[#d6fffb] transition hover:border-[#8ffdf0] hover:bg-[#5eead4]/16 hover:text-white sm:h-12 sm:rounded-[20px] sm:px-4 sm:text-sm"
              >
                {userLocation.status === 'requesting' ? 'Buscando...' : 'Mi ubicación'}
              </button>

              {hasSearchFilters ? (
                <Link
                  href={searchConfig.clearHref}
                  className="inline-flex h-10 sm:h-12 items-center justify-center rounded-[18px] sm:rounded-[20px] border border-white/18 bg-white/[0.04] px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white/84 transition hover:border-white/38 hover:text-white lg:block"
                >
                  Limpiar
                </Link>
              ) : (
                <div className="hidden lg:block" />
              )}

              {listHref ? (
                <a
                  href={listHref}
                  className="hidden lg:inline-flex h-10 sm:h-12 items-center justify-center rounded-[18px] sm:rounded-[20px] border border-white/18 bg-white/[0.04] px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white/84 transition hover:border-white/38 hover:text-white"
                >
                  {searchConfig.listLabel || 'Ver listado'}
                </a>
              ) : (
                <div className="hidden lg:block" />
              )}
            </form>
            ) : null}
          </div>
        </div>
      )}

      <div className={fullBleed ? 'relative h-[calc(100dvh-57px)] min-h-[calc(100dvh-57px)]' : 'relative h-[82vh] min-h-[680px] max-h-[980px] overflow-hidden rounded-b-[36px] sm:min-h-[760px]'}>
        <div ref={mapHostRef} className={fullBleed ? 'ufx-public-map h-[calc(100dvh-57px)] min-h-[calc(100dvh-57px)] w-full' : 'ufx-public-map h-full w-full'} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,143,31,0.12),transparent_22%),linear-gradient(180deg,rgba(19,2,31,0.12)_0%,rgba(19,2,31,0.02)_26%,rgba(19,2,31,0.14)_82%,rgba(19,2,31,0.76)_100%)]" />

        {showMapSignupCta ? (
          <div className="pointer-events-none absolute right-3 top-3 z-[470] sm:right-5 sm:top-5">
            <Link
              href={MAP_PROFILE_SETUP_AUTH_HREF}
              className="pointer-events-auto inline-flex h-11 items-center justify-center rounded-full border border-[#ffb35c]/45 bg-[#ff8f1f] px-4 text-sm font-black text-[#25002f] shadow-[0_18px_45px_-24px_rgba(0,0,0,0.95)] transition hover:border-[#ffd29a] hover:bg-[#ffa43d] sm:h-12 sm:px-5"
            >
              Quiero aparecer en el mapa!
            </Link>
          </div>
        ) : null}

        {selectedPoint ? (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[460] sm:bottom-5 sm:left-1/2 sm:right-auto sm:w-[min(780px,calc(100%-2.5rem))] sm:-translate-x-1/2">
            <article className="pointer-events-auto max-h-[44dvh] w-full overflow-y-auto rounded-[24px] border border-white/18 bg-[linear-gradient(135deg,rgba(48,20,61,0.96),rgba(28,3,43,0.94)_58%,rgba(255,143,31,0.12))] p-2.5 text-white shadow-[0_28px_100px_-52px_rgba(0,0,0,1)] backdrop-blur-xl sm:max-h-none sm:overflow-hidden sm:rounded-[30px] sm:p-4">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[16px] border border-white/16 bg-white/[0.06] shadow-[0_14px_40px_-24px_rgba(0,0,0,1)] sm:h-[72px] sm:w-[72px] sm:rounded-[20px]">
                  {getSelectedMedia(selectedPoint) ? (
                    <img src={getSelectedMedia(selectedPoint)} alt={selectedPoint.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-black text-white/80">
                      {selectedPoint.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>

                  <div className="min-w-0 flex-1">
                    <div className="min-w-0">
                        <p className="truncate text-base font-black leading-tight text-white sm:text-2xl">{selectedPoint.name}</p>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-white/68 sm:mt-1 sm:text-xs">{selectedPoint.city || 'Sin ciudad visible'}</p>
                        {selectedOwnerName && selectedOwnerName !== selectedPoint.name ? (
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-white/52 sm:mt-1 sm:text-xs">Responsable: {selectedOwnerName}</p>
                        ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-[0.08em] sm:mt-3 sm:text-[11px]">
                    <span
                          className={`rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1 ${selectedAvailabilityClass}`}
                    >
                          {selectedAvailabilityLabel}
                    </span>
                    <span className="rounded-full border border-[#ff8f1f]/45 bg-[#ff8f1f]/12 px-2 py-0.5 text-[#ffd6a6] sm:px-2.5 sm:py-1">
                      {selectedPoint.precision === 'exact' ? 'Punto verificado' : 'Zona estimada'}
                    </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-start gap-2 sm:w-[440px]">
                  <div className="hidden flex-1 grid-cols-4 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.045] sm:grid">
                    <div className="border-r border-white/10 px-2.5 py-3">
                      <p className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-white/42">Rating</p>
                      <p className="mt-1 text-base font-black text-white">
                        {selectedRating > 0 ? selectedRating.toFixed(1) : '-'}
                      </p>
                    </div>
                    <div className="border-r border-white/10 px-2.5 py-3">
                      <p className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-white/42">Reseñas</p>
                      <p className="mt-1 text-base font-black text-white">{formatCompactNumber(selectedPoint.reviewsCount || 0)}</p>
                    </div>
                    <div className="border-r border-white/10 px-2.5 py-3">
                      <p className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-white/42">Coment.</p>
                      <p className="mt-1 text-base font-black text-white">{formatCompactNumber(selectedCommentsCount)}</p>
                    </div>
                    <div className="px-2.5 py-3">
                      <p className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-white/42">Trabajos</p>
                      <p className="mt-1 text-base font-black text-white">{formatCompactNumber(selectedPoint.completedJobsTotal || 0)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeSelectedPoint}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.06] text-xs font-semibold text-white/72 transition hover:border-white/35 hover:text-white"
                    aria-label="Cerrar tecnico seleccionado"
                  >
                    x
                  </button>
                </div>
              </div>

              {selectedProfileSummary ? (
                <p className="mt-4 hidden line-clamp-2 rounded-[20px] border border-white/10 bg-black/16 px-3 py-2 text-sm leading-6 text-white/76 sm:block">
                  {selectedProfileSummary}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-white/76 sm:hidden">
                <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1">
                  {selectedZoneLabel || 'Sin zona visible'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1">
                  {selectedPoint.radiusKm} km
                </span>
                <span className="max-w-full truncate rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1">
                  {selectedPoint.workingHoursLabel}
                </span>
              </div>

              <div className="mt-3 hidden gap-2 text-xs sm:grid sm:grid-cols-4">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">Zona base</p>
                  <p className="mt-1 truncate font-semibold text-white/78">{selectedZoneLabel || 'Sin zona visible'}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">Radio</p>
                  <p className="mt-1 font-semibold text-white/78">{selectedPoint.radiusKm} km</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2 sm:col-span-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">Horario</p>
                  <p className="mt-1 truncate font-semibold text-white/78">{selectedPoint.workingHoursLabel}</p>
                </div>
                {selectedSocialLabels.length > 0 ? (
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2 sm:col-span-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">Redes cargadas</p>
                    <p className="mt-1 font-semibold text-white/78">{selectedSocialLabels.join(' · ')}</p>
                  </div>
                ) : null}
              </div>

              {selectedSpecialties.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-4">
                  {selectedSpecialties.map((specialty) => (
                    <span key={specialty} className="rounded-full border border-white/12 bg-black/18 px-2 py-0.5 text-[10px] font-bold text-white/78 sm:px-2.5 sm:py-1 sm:text-[11px]">
                      {specialty}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-4 sm:justify-end">
                <Link
                  href={selectedPoint.profileHref}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-[#ff8f1f] px-4 text-sm font-black text-[#2a0338] transition hover:bg-[#ffa748] sm:h-11 sm:flex-none sm:px-5"
                >
                  Ver perfil
                </Link>
                {selectedPoint.whatsappHref ? (
                  <a
                    href={selectedPoint.whatsappHref}
                    target="_blank"
                    rel="noreferrer noopener"
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-[#25d366]/45 bg-[#25d366]/12 px-4 text-sm font-black text-[#d9ffe8] transition hover:border-[#25d366] hover:text-white sm:h-11 sm:flex-none sm:px-5"
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}
