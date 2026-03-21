'use client';

import Link from 'next/link';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
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

export type PublicTechniciansMapQuickLink = {
  label: string;
  href: string;
};

export type PublicTechniciansMapSearchConfig = {
  actionHref: string;
  clearHref: string;
  query: string;
  options: string[];
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
const defaultPlaceholder = 'Ingresa ciudades o barrios';

const formatCompactNumber = (value: number) => value.toLocaleString('es-AR');

const toRadians = (value: number) => (value * Math.PI) / 180;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildMarkerHtml = (point: DisplayPoint, selected: boolean) => {
  const badge = point.openNow ? 'Disponible' : 'Fuera';
  return `
    <div class="ufx-map-pin ${point.openNow ? 'is-open' : 'is-closed'} ${selected ? 'is-selected' : ''}">
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

const getSelectedMedia = (point: PublicTechnicianMapPoint) => point.avatarUrl || point.companyLogoUrl || '';

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
      return preferUserLocation ? 'Mapa centrado cerca tuyo' : 'Ubicacion lista para recentrar';
    case 'requesting':
      return 'Buscando tu ubicacion actual...';
    case 'denied':
      return 'Activa ubicacion para enfocar el mapa en tu zona';
    case 'unsupported':
      return 'Este navegador no permite geolocalizacion';
    case 'error':
      return 'No pudimos detectar tu ubicacion en este intento';
    default:
      return preferUserLocation ? 'Arrancamos cerca de tu ubicacion si das permiso' : 'Puedes recentrar con tu ubicacion';
  }
};

export default function PublicTechniciansMap({
  points,
  preferUserLocation = true,
  eyebrow = 'Tecnicos disponibles',
  title = 'Explora cobertura publica con un mapa full screen',
  description = 'Navega tecnicos publicados, filtra por zona y abre perfiles o WhatsApp sin perder el contexto del mapa.',
  searchConfig,
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
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(points[0]?.id || null);
  const [hasRequestedUserFocus, setHasRequestedUserFocus] = useState(preferUserLocation);
  const [userLocation, setUserLocation] = useState<UserLocationState>({
    status: preferUserLocation ? 'requesting' : 'idle',
    lat: null,
    lng: null,
    accuracyMeters: null,
  });
  const zonesListId = useId().replace(/:/g, '');

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

    setUserLocation({
      status: 'requesting',
      lat: null,
      lng: null,
      accuracyMeters: null,
    });

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

  const selectPoint = (pointId: string) => {
    shouldRecenterSelectionRef.current = true;
    setSelectedId(pointId);
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
      window.setTimeout(() => map.invalidateSize(false), 120);
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
      map.fitBounds(userBounds.pad(0.18), {
        maxZoom: nearbyPoints.length === 1 ? 11 : 12,
        animate: false,
      });
      return;
    }

    const bounds = L.latLngBounds(displayPoints.map((point) => [point.mapLat, point.mapLng] as [number, number]));
    map.fitBounds(bounds.pad(0.14), {
      maxZoom: displayPoints.length === 1 ? 12 : 8,
      animate: false,
    });
  }, [displayPoints, mapReady, selectedId, shouldFocusUserLocation, userLocation]);

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

  return (
    <section className="mt-6 overflow-hidden rounded-[36px] border border-white/15 bg-[#12001c] shadow-[0_40px_110px_-65px_rgba(0,0,0,0.92)]">
      <div className="border-b border-white/12 bg-[#190426] px-3 py-3 sm:px-4 lg:px-6">
        <div className="mx-auto w-full max-w-[1500px]">
          {searchConfig ? (
            <form
              method="get"
              action={searchConfig.actionHref}
              className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]"
            >
              <div className="min-w-0 xl:col-span-1">
                <input
                  id="vidriera-zona"
                  type="text"
                  name="zona"
                  defaultValue={searchConfig.query}
                  list={zonesListId}
                  placeholder={searchConfig.placeholder || defaultPlaceholder}
                  className="h-12 w-full rounded-[20px] border border-white/18 bg-black/25 px-4 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-[#ff8f1f] focus:bg-black/34"
                />
                <datalist id={zonesListId}>
                  {searchConfig.options.map((zone) => (
                    <option key={`zona-${zone}`} value={zone} />
                  ))}
                </datalist>
              </div>

              <button
                type="submit"
                className="h-12 rounded-[20px] bg-[#ff8f1f] px-4 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
              >
                Buscar zona
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasRequestedUserFocus(true);
                  requestUserLocation();
                }}
                className="h-12 rounded-[20px] border border-[#5eead4]/42 bg-[#5eead4]/10 px-4 text-sm font-semibold text-[#d6fffb] transition hover:border-[#8ffdf0] hover:bg-[#5eead4]/16 hover:text-white"
              >
                {userLocation.status === 'requesting' ? 'Buscando...' : 'Usar mi ubicacion'}
              </button>

              {searchConfig.query ? (
                <Link
                  href={searchConfig.clearHref}
                  className="inline-flex h-12 items-center justify-center rounded-[20px] border border-white/18 bg-white/[0.04] px-4 text-sm font-semibold text-white/84 transition hover:border-white/38 hover:text-white"
                >
                  Limpiar
                </Link>
              ) : (
                <div className="hidden xl:block" />
              )}

              {listHref ? (
                <a
                  href={listHref}
                  className="inline-flex h-12 items-center justify-center rounded-[20px] border border-white/18 bg-white/[0.04] px-4 text-sm font-semibold text-white/84 transition hover:border-white/38 hover:text-white"
                >
                  {searchConfig.listLabel || 'Ver listado'}
                </a>
              ) : (
                <div className="hidden xl:block" />
              )}
            </form>
          ) : null}
        </div>
      </div>

      <div className="relative h-[82vh] min-h-[680px] sm:min-h-[760px] max-h-[980px]">
        <div ref={mapHostRef} className="ufx-public-map h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,143,31,0.12),transparent_22%),linear-gradient(180deg,rgba(19,2,31,0.12)_0%,rgba(19,2,31,0.02)_26%,rgba(19,2,31,0.14)_82%,rgba(19,2,31,0.76)_100%)]" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[460] p-2.5 sm:p-4 lg:p-5">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-2 sm:gap-3 lg:flex-row lg:items-end lg:justify-between">
            {selectedPoint ? (
              <article className="pointer-events-auto ufx-tech-card w-full rounded-[26px] p-3 shadow-[0_24px_90px_-48px_rgba(0,0,0,1)] sm:p-4 lg:w-[250px]">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[20px] border border-white/15 bg-white/[0.05] sm:h-20 sm:w-20">
                    {getSelectedMedia(selectedPoint) ? (
                      <img src={getSelectedMedia(selectedPoint)} alt={selectedPoint.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/80">
                        {selectedPoint.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold text-white sm:text-xl">{selectedPoint.name}</p>
                    <p className="mt-1 truncate text-xs text-white/70 sm:text-sm">{selectedPoint.city || 'Sin ciudad visible'}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] sm:mt-3">
                      <span
                        className={`rounded-full px-2.5 py-1 ${
                          selectedPoint.openNow
                            ? 'border border-emerald-300/28 bg-emerald-400/10 text-emerald-100'
                            : 'border border-violet-300/28 bg-violet-400/10 text-violet-100'
                        }`}
                      >
                        {selectedPoint.openNow ? 'Disponible ahora' : 'Fuera de horario'}
                      </span>
                      <span className="rounded-full border border-[#ff8f1f]/45 bg-[#ff8f1f]/12 px-2.5 py-1 text-[#ffd6a6]">
                        {selectedPoint.precision === 'exact' ? 'Punto verificado' : 'Zona estimada'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedPoint.specialties.length > 0 ? (
                    selectedPoint.specialties.slice(0, 1).map((specialty) => (
                      <span
                        key={`${selectedPoint.id}-${specialty}`}
                        className="rounded-full border border-white/14 bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/82"
                      >
                        {specialty}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-white/14 bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/62">
                      Sin rubros cargados
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
                  <Link
                    href={selectedPoint.profileHref}
                    className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                  >
                    Ver perfil
                  </Link>
                  {selectedPoint.whatsappHref ? (
                    <a
                      href={selectedPoint.whatsappHref}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </article>
            ) : null}

            <div className="pointer-events-auto w-full rounded-[24px] border border-white/12 bg-[#170425]/70 p-2 shadow-[0_20px_80px_-48px_rgba(0,0,0,1)] backdrop-blur-xl sm:p-3 lg:w-[760px] lg:max-w-[760px]">
              <div className="mb-2 flex items-center justify-end gap-3">
                {listHref ? (
                  <a
                    href={listHref}
                    className="rounded-full border border-white/14 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/84 transition hover:border-white/34 hover:text-white"
                  >
                    <span className="hidden sm:inline">{searchConfig?.listLabel || 'Ver listado'}</span>
                    <span className="sm:hidden">Listado</span>
                  </a>
                ) : null}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {displayPoints.map((point) => {
                  const pointMedia = getSelectedMedia(point);
                  const isActive = point.id === selectedPoint?.id;

                  return (
                    <button
                      key={point.id}
                      type="button"
                      onClick={() => selectPoint(point.id)}
                      className={`min-w-[154px] rounded-[18px] border px-2.5 py-2.5 text-left transition sm:min-w-[180px] sm:rounded-[20px] ${
                        isActive
                          ? 'border-[#ff8f1f]/55 bg-[#ff8f1f]/12 shadow-[0_18px_40px_-30px_rgba(255,143,31,0.95)]'
                          : 'border-white/12 bg-black/[0.18] hover:border-white/30 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/14 bg-white/[0.05] sm:h-11 sm:w-11">
                          {pointMedia ? (
                            <img src={pointMedia} alt={point.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/80">
                              {point.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-white sm:text-sm">{point.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-white/66">{point.city || point.coverageArea || 'UrbanFix'}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                point.openNow
                                  ? 'border border-emerald-300/24 bg-emerald-400/10 text-emerald-100'
                                  : 'border border-violet-300/24 bg-violet-400/10 text-violet-100'
                              }`}
                            >
                              {point.openNow ? 'Disponible' : 'Fuera'}
                            </span>
                            <span className="hidden rounded-full border border-white/14 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-white/78 sm:inline-flex">
                              Likes {formatCompactNumber(point.likesCount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
