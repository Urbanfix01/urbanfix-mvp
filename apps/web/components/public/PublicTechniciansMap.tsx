'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Circle as LeafletCircle, LayerGroup, Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

export type PublicTechnicianMapPoint = {
  id: string;
  name: string;
  profileHref: string;
  whatsappHref: string;
  city: string;
  coverageArea: string;
  specialties: string[];
  lat: number;
  lng: number;
  radiusKm: number;
  precision: 'exact' | 'approx';
  openNow: boolean;
  workingHoursLabel: string;
  likesCount: number;
  rating: number | null;
  reviewsCount: number;
  completedJobsTotal: number;
  avatarUrl: string;
  companyLogoUrl: string;
};

type Props = {
  points: PublicTechnicianMapPoint[];
  preferUserLocation?: boolean;
};

type DisplayPoint = PublicTechnicianMapPoint & {
  mapLat: number;
  mapLng: number;
};

const ARGENTINA_CENTER: [number, number] = [-38.4, -63.6];
const ARGENTINA_DEFAULT_ZOOM = 4.2;
const USER_FOCUS_DISTANCE_KM = 120;
const USER_FOCUS_NEAREST_LIMIT = 6;
const USER_FOCUS_FALLBACK_ZOOM = 10;

const formatCompactNumber = (value: number) => value.toLocaleString('es-AR');

const toRadians = (value: number) => (value * Math.PI) / 180;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildMarkerHtml = (point: DisplayPoint) => {
  const badge = point.openNow ? 'Disponible' : 'Fuera';
  return `
    <div class="ufx-map-pin ${point.openNow ? 'is-open' : 'is-closed'}">
      <div class="ufx-map-pin-core"></div>
      <div class="ufx-map-pin-glow"></div>
      <span class="ufx-map-pin-badge">${badge}</span>
    </div>
  `;
};

const buildTooltipHtml = (point: DisplayPoint) => {
  const precisionLabel = point.precision === 'exact' ? 'Punto verificado' : 'Zona estimada';
  return `
    <div class="ufx-map-tooltip-card">
      <p class="ufx-map-tooltip-title">${escapeHtml(point.name)}</p>
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

const getSelectedMedia = (point: PublicTechnicianMapPoint) =>
  point.avatarUrl || point.companyLogoUrl || '';

const getDistanceKm = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

type UserLocationState =
  | { status: 'idle' | 'requesting' | 'unsupported' | 'denied' | 'error'; lat: null; lng: null; accuracyMeters: null }
  | { status: 'ready'; lat: number; lng: number; accuracyMeters: number | null };

const getLocationStatusLabel = (status: UserLocationState['status'], preferUserLocation: boolean) => {
  switch (status) {
    case 'ready':
      return preferUserLocation ? 'Mapa centrado en tu ubicacion actual' : 'Ubicacion disponible para recentrar';
    case 'requesting':
      return 'Buscando tu ubicacion actual...';
    case 'denied':
      return 'Activa el permiso de ubicacion para centrar el mapa cerca tuyo';
    case 'unsupported':
      return 'Este dispositivo no permite geolocalizacion desde el navegador';
    case 'error':
      return 'No pudimos detectar tu ubicacion en este intento';
    default:
      return preferUserLocation ? 'Usaremos tu ubicacion para acercar el mapa automaticamente' : 'Puedes recentrar el mapa usando tu ubicacion';
  }
};

export default function PublicTechniciansMap({ points, preferUserLocation = true }: Props) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);
  const userAccuracyCircleRef = useRef<LeafletCircle | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const isMountedRef = useRef(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(points[0]?.id || null);
  const [hasRequestedUserFocus, setHasRequestedUserFocus] = useState(preferUserLocation);
  const [userLocation, setUserLocation] = useState<UserLocationState>({
    status: preferUserLocation ? 'requesting' : 'idle',
    lat: null,
    lng: null,
    accuracyMeters: null,
  });

  const displayPoints = useMemo(() => spreadOverlappingPoints(points), [points]);
  const selectedPoint = useMemo(
    () => displayPoints.find((point) => point.id === selectedId) || displayPoints[0] || null,
    [displayPoints, selectedId]
  );
  const nearestPointToUser = useMemo(() => {
    if (userLocation.status !== 'ready' || displayPoints.length === 0) return null;

    return displayPoints
      .map((point) => ({
        point,
        distanceKm: getDistanceKm(userLocation.lat, userLocation.lng, point.lat, point.lng),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0]?.point || null;
  }, [displayPoints, userLocation]);
  const shouldFocusUserLocation = preferUserLocation || hasRequestedUserFocus;

  const stats = useMemo(() => {
    const exactCount = points.filter((point) => point.precision === 'exact').length;
    const approxCount = points.length - exactCount;
    const openNowCount = points.filter((point) => point.openNow).length;
    return {
      total: points.length,
      exactCount,
      approxCount,
      openNowCount,
    };
  }, [points]);

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

    setUserLocation(() => ({
      status: 'requesting',
      lat: null,
      lng: null,
      accuracyMeters: null,
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) return;

        setUserLocation({
          status: 'ready',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
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

  useEffect(() => {
    setSelectedId((current) => {
      if (current && points.some((point) => point.id === current)) return current;
      return points[0]?.id || null;
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
    if (!shouldFocusUserLocation || !nearestPointToUser) return;

    setSelectedId((current) => {
      if (!current || current === points[0]?.id) return nearestPointToUser.id;
      return current;
    });
  }, [nearestPointToUser, points, shouldFocusUserLocation]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const initMap = async () => {
      if (!mapHostRef.current || mapRef.current) return;
      const L = await import('leaflet');
      if (cancelled || !mapHostRef.current) return;

      leafletRef.current = L;

      const map = L.map(mapHostRef.current, {
        center: ARGENTINA_CENTER,
        zoom: ARGENTINA_DEFAULT_ZOOM,
        zoomControl: false,
        minZoom: 4,
        maxZoom: 18,
        worldCopyJump: false,
      });

      map.attributionControl.setPosition('bottomleft');
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);

      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize(false);
      });
      resizeObserver.observe(mapHostRef.current);
      window.setTimeout(() => map.invalidateSize(false), 90);
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
          html: buildMarkerHtml(point),
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
        setSelectedId(point.id);
      });

      marker.addTo(layer);
    });

    if (displayPoints.length === 0) {
      if (shouldFocusUserLocation && userLocation.status === 'ready') {
        map.setView([userLocation.lat, userLocation.lng], USER_FOCUS_FALLBACK_ZOOM, { animate: false });
        return;
      }
      map.setView(ARGENTINA_CENTER, ARGENTINA_DEFAULT_ZOOM);
      return;
    }

    if (shouldFocusUserLocation && userLocation.status === 'ready') {
      const nearestPoints = displayPoints
        .map((point) => ({
          point,
          distanceKm: getDistanceKm(userLocation.lat, userLocation.lng, point.lat, point.lng),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
      const nearbyPoints = nearestPoints
        .filter((entry) => entry.distanceKm <= USER_FOCUS_DISTANCE_KM)
        .slice(0, USER_FOCUS_NEAREST_LIMIT)
        .map((entry) => entry.point);

      if (nearbyPoints.length === 0) {
        map.setView([userLocation.lat, userLocation.lng], USER_FOCUS_FALLBACK_ZOOM, { animate: false });
        return;
      }

      const userBounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng] as [number, number],
        ...nearbyPoints.map((point) => [point.mapLat, point.mapLng] as [number, number]),
      ]);
      map.fitBounds(userBounds.pad(0.2), {
        maxZoom: nearbyPoints.length === 1 ? 11 : 12,
        animate: false,
      });
      return;
    }

    const bounds = L.latLngBounds(displayPoints.map((point) => [point.mapLat, point.mapLng] as [number, number]));
    map.fitBounds(bounds.pad(0.18), {
      maxZoom: displayPoints.length === 1 ? 12 : 8,
      animate: false,
    });
  }, [displayPoints, mapReady, shouldFocusUserLocation, userLocation]);

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

    circleRef.current = leafletRef.current.circle([selectedPoint.mapLat, selectedPoint.mapLng], {
      radius: Math.max(1000, selectedPoint.radiusKm * 1000),
      color: selectedPoint.openNow ? '#ff9b30' : '#7c3aed',
      weight: 1.5,
      opacity: 0.9,
      fillColor: selectedPoint.openNow ? '#ff9b30' : '#7c3aed',
      fillOpacity: 0.12,
      dashArray: selectedPoint.precision === 'approx' ? '8 8' : undefined,
    }).addTo(mapRef.current);
  }, [mapReady, selectedPoint]);

  if (points.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 overflow-hidden rounded-[32px] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] shadow-[0_24px_70px_-40px_rgba(0,0,0,0.88)]">
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Mapa interactivo</p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-[2rem]">
              Tecnicos disponibles en un mapa publico y navegable
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/72">
              Explora tecnicos activos por zona, identifica cobertura real y revisa rapido si la ubicacion es exacta o
              aproximada antes de entrar al perfil.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-[11px] font-semibold text-white/75">
                {getLocationStatusLabel(userLocation.status, preferUserLocation)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setHasRequestedUserFocus(true);
                  requestUserLocation();
                }}
                className="rounded-full border border-[#5eead4]/45 bg-[#5eead4]/10 px-3 py-1 text-[11px] font-semibold text-[#c6fff6] transition hover:border-[#8ffdf0] hover:bg-[#5eead4]/16 hover:text-white"
              >
                {userLocation.status === 'requesting' ? 'Buscando...' : 'Usar mi ubicacion'}
              </button>
            </div>
          </div>
          <div className="grid min-w-[250px] grid-cols-2 gap-2 text-xs text-white/80 sm:min-w-[320px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Visibles</p>
              <p className="mt-1 text-xl font-semibold text-white">{formatCompactNumber(stats.total)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Disponibles ahora</p>
              <p className="mt-1 text-xl font-semibold text-[#ffd7a8]">{formatCompactNumber(stats.openNowCount)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Ubicacion exacta</p>
              <p className="mt-1 text-xl font-semibold text-white">{formatCompactNumber(stats.exactCount)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Zona estimada</p>
              <p className="mt-1 text-xl font-semibold text-white">{formatCompactNumber(stats.approxCount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="relative min-h-[520px] border-b border-white/10 xl:border-b-0 xl:border-r">
          <div ref={mapHostRef} className="ufx-public-map h-[520px] w-full" />
          <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">
              Punto exacto = pin sin guiones
            </span>
            <span className="rounded-full border border-violet-300/35 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold text-violet-100">
              Zona estimada = radio punteado
            </span>
            {userLocation.status === 'ready' && (
              <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-100">
                Tu ubicacion = pulso turquesa
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col bg-[linear-gradient(180deg,rgba(7,3,18,0.35),rgba(17,8,28,0.72))]">
          {selectedPoint ? (
            <>
              <div className="border-b border-white/10 px-5 py-5 sm:px-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">Tecnico seleccionado</p>
                <div className="mt-4 flex items-start gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[22px] border border-white/15 bg-white/[0.06]">
                    {getSelectedMedia(selectedPoint) ? (
                      <img
                        src={getSelectedMedia(selectedPoint)}
                        alt={selectedPoint.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/80">
                        {selectedPoint.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold text-white">{selectedPoint.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-white/85">
                        {selectedPoint.city || 'Sin ciudad'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 ${
                          selectedPoint.openNow
                            ? 'border border-emerald-300/30 bg-emerald-400/12 text-emerald-100'
                            : 'border border-violet-300/30 bg-violet-400/12 text-violet-100'
                        }`}
                      >
                        {selectedPoint.openNow ? 'Disponible ahora' : 'Fuera de horario'}
                      </span>
                      <span className="rounded-full border border-[#ff8f1f]/55 bg-[#ff8f1f]/12 px-2.5 py-1 text-[#ffd6a6]">
                        {selectedPoint.precision === 'exact' ? 'Punto verificado' : 'Zona estimada'}
                      </span>
                    </div>
                    {selectedPoint.rating !== null && (
                      <p className="mt-3 text-sm text-white/74">
                        Rating {selectedPoint.rating.toFixed(1)} · {formatCompactNumber(selectedPoint.reviewsCount)} reseñas ·{' '}
                        {formatCompactNumber(selectedPoint.completedJobsTotal)} trabajos
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-5 py-5 text-sm text-white/74 sm:px-6">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Cobertura</p>
                  <p className="mt-2 leading-7 text-white/84">
                    {selectedPoint.coverageArea || `Radio de ${selectedPoint.radiusKm} km desde ${selectedPoint.city || 'su zona base'}`}
                  </p>
                  <p className="mt-2 text-xs text-white/55">Radio estimado: {selectedPoint.radiusKm} km</p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Horario operativo</p>
                  <p className="mt-2 leading-7 text-white/84">{selectedPoint.workingHoursLabel}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Rubros</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPoint.specialties.length > 0 ? (
                      selectedPoint.specialties.map((specialty) => (
                        <span
                          key={`${selectedPoint.id}-${specialty}`}
                          className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/82"
                        >
                          {specialty}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/60">
                        Sin rubros cargados
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Likes</p>
                      <p className="mt-1 text-lg font-semibold text-white">{formatCompactNumber(selectedPoint.likesCount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Reseñas</p>
                      <p className="mt-1 text-lg font-semibold text-white">{formatCompactNumber(selectedPoint.reviewsCount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Trabajos</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {formatCompactNumber(selectedPoint.completedJobsTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-3 border-t border-white/10 px-5 py-5 sm:px-6">
                <Link
                  href={selectedPoint.profileHref}
                  className="rounded-full bg-[#ff8f1f] px-4 py-2.5 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                >
                  Ver perfil
                </Link>
                {selectedPoint.whatsappHref && (
                  <a
                    href={selectedPoint.whatsappHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full border border-white/30 px-4 py-2.5 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="px-5 py-8 text-sm text-white/72 sm:px-6">Todavia no hay tecnicos visibles en el mapa.</div>
          )}
        </div>
      </div>
    </section>
  );
}
