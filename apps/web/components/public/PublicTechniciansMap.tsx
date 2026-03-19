'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Circle as LeafletCircle, LayerGroup, Map as LeafletMap } from 'leaflet';

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
};

type DisplayPoint = PublicTechnicianMapPoint & {
  mapLat: number;
  mapLng: number;
};

const ARGENTINA_CENTER: [number, number] = [-38.4, -63.6];
const ARGENTINA_DEFAULT_ZOOM = 4.2;

const formatCompactNumber = (value: number) => value.toLocaleString('es-AR');

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

export default function PublicTechniciansMap({ points }: Props) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(points[0]?.id || null);

  const displayPoints = useMemo(() => spreadOverlappingPoints(points), [points]);
  const selectedPoint = useMemo(
    () => displayPoints.find((point) => point.id === selectedId) || displayPoints[0] || null,
    [displayPoints, selectedId]
  );

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

  useEffect(() => {
    setSelectedId((current) => {
      if (current && points.some((point) => point.id === current)) return current;
      return points[0]?.id || null;
    });
  }, [points]);

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
      map.setView(ARGENTINA_CENTER, ARGENTINA_DEFAULT_ZOOM);
      return;
    }

    const bounds = L.latLngBounds(displayPoints.map((point) => [point.mapLat, point.mapLng] as [number, number]));
    map.fitBounds(bounds.pad(0.18), {
      maxZoom: displayPoints.length === 1 ? 12 : 8,
      animate: false,
    });
  }, [displayPoints, mapReady]);

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
