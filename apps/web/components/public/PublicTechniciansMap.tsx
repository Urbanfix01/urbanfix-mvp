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
  availabilityStatus?: 'open' | 'closed' | 'unspecified';
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

export default function PublicTechniciansMap({
  points,
  preferUserLocation = true,
  eyebrow: _eyebrow,
  title: _title,
  description: _description,
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    () => displayPoints.find((point) => point.id === selectedId) || null,
    [displayPoints, selectedId]
  );
  const shouldFocusUserLocation = preferUserLocation || hasRequestedUserFocus;

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
  const hasSearchFilters = Boolean(searchConfig?.query || searchConfig?.hiddenFields?.some((field) => field.value));

  return (
    <section className="mt-6 overflow-hidden rounded-[36px] border border-white/15 bg-[#12001c] shadow-[0_40px_110px_-65px_rgba(0,0,0,0.92)]">
      <div className="border-b border-white/12 bg-[#190426] px-2.5 py-2.5 sm:px-4 lg:px-6">
        <div className="mx-auto w-full max-w-[1500px]">
          {searchConfig ? (
            <form
              method="get"
              action={searchConfig.actionHref}
              className="grid gap-1.5 sm:gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] xl:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]"
            >
              {searchConfig.hiddenFields?.map((field) => (
                <input key={`${field.name}-${field.value}`} type="hidden" name={field.name} value={field.value} />
              ))}

              <div className="min-w-0 sm:col-span-1">
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

              <button
                type="submit"
                className="h-10 sm:h-12 rounded-[18px] sm:rounded-[20px] bg-[#ff8f1f] px-3 sm:px-4 text-xs sm:text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
              >
                Buscar
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasRequestedUserFocus(true);
                  requestUserLocation();
                }}
                className="h-10 sm:h-12 rounded-[18px] sm:rounded-[20px] border border-[#5eead4]/42 bg-[#5eead4]/10 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-[#d6fffb] transition hover:border-[#8ffdf0] hover:bg-[#5eead4]/16 hover:text-white"
              >
                {userLocation.status === 'requesting' ? 'Buscando...' : 'Ubicación'}
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

      <div className="relative h-[82vh] min-h-[680px] sm:min-h-[760px] max-h-[980px]">
        <div ref={mapHostRef} className="ufx-public-map h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,143,31,0.12),transparent_22%),linear-gradient(180deg,rgba(19,2,31,0.12)_0%,rgba(19,2,31,0.02)_26%,rgba(19,2,31,0.14)_82%,rgba(19,2,31,0.76)_100%)]" />

        {selectedPoint ? (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[460] sm:bottom-5 sm:left-5 sm:right-auto">
            <article className="pointer-events-auto ufx-tech-card w-full max-w-[420px] rounded-[28px] px-3 py-3 shadow-[0_24px_90px_-48px_rgba(0,0,0,1)] sm:px-4">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[18px] border border-white/15 bg-white/[0.05] sm:h-16 sm:w-16">
                  {getSelectedMedia(selectedPoint) ? (
                    <img src={getSelectedMedia(selectedPoint)} alt={selectedPoint.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white/80">
                      {selectedPoint.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white sm:text-lg">{selectedPoint.name}</p>
                      <p className="mt-0.5 truncate text-xs text-white/70">{selectedPoint.city || 'Sin ciudad visible'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/18 bg-white/[0.05] text-xs font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
                      aria-label="Cerrar tecnico seleccionado"
                    >
                      x
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] sm:text-[11px]">
                    <span
                        className={`rounded-full px-2.5 py-1 ${
                          (selectedPoint.availabilityStatus || (selectedPoint.openNow ? 'open' : 'closed')) === 'open'
                          ? 'border border-emerald-300/28 bg-emerald-400/10 text-emerald-100'
                            : (selectedPoint.availabilityStatus || (selectedPoint.openNow ? 'open' : 'closed')) === 'closed'
                              ? 'border border-violet-300/28 bg-violet-400/10 text-violet-100'
                              : 'border border-slate-300/28 bg-slate-400/10 text-slate-100'
                      }`}
                    >
                        {(selectedPoint.availabilityStatus || (selectedPoint.openNow ? 'open' : 'closed')) === 'open'
                          ? 'Disponible ahora'
                          : (selectedPoint.availabilityStatus || (selectedPoint.openNow ? 'open' : 'closed')) === 'closed'
                            ? 'Fuera de horario'
                            : 'Disponibilidad a coordinar'}
                    </span>
                    <span className="rounded-full border border-[#ff8f1f]/45 bg-[#ff8f1f]/12 px-2.5 py-1 text-[#ffd6a6]">
                      {selectedPoint.precision === 'exact' ? 'Punto verificado' : 'Zona estimada'}
                    </span>
                    <span className="rounded-full border border-white/14 bg-white/[0.06] px-2.5 py-1 text-white/78">
                      {selectedPoint.specialties[0] || 'Sin rubros'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
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
          </div>
        ) : null}
      </div>
    </section>
  );
}
