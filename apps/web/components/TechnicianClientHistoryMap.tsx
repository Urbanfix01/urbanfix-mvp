'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import { MapPinned } from 'lucide-react';

export type TechnicianClientHistoryMapPoint = {
  id: string;
  name: string;
  totalAmount: number;
  movements: number;
  lastDateLabel: string;
  address: string;
  lat: number;
  lon: number;
};

type Props = {
  points: TechnicianClientHistoryMapPoint[];
  onSelectPoint: (pointId: string) => void;
  onOpenMap: () => void;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildClientMarkerHtml = (index: number) => `
  <div class="ufx-client-map-pin">
    <span class="ufx-client-map-pin-pulse"></span>
    <span class="ufx-client-map-pin-core">${index + 1}</span>
  </div>
`;

const buildClientTooltipHtml = (point: TechnicianClientHistoryMapPoint) => `
  <div class="ufx-client-map-tooltip-card">
    <p class="ufx-client-map-tooltip-title">${escapeHtml(point.name)}</p>
    <p class="ufx-client-map-tooltip-meta">${escapeHtml(point.address)}</p>
    <p class="ufx-client-map-tooltip-subtle">${point.movements} mov. · $${point.totalAmount.toLocaleString('es-AR')}</p>
  </div>
`;

export default function TechnicianClientHistoryMap({ points, onSelectPoint, onOpenMap }: Props) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const onSelectPointRef = useRef(onSelectPoint);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onSelectPointRef.current = onSelectPoint;
  }, [onSelectPoint]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const initMap = async () => {
      if (!mapHostRef.current || mapRef.current) return;
      const L = await import('leaflet');
      if (cancelled || !mapHostRef.current) return;

      leafletRef.current = L;

      const map = L.map(mapHostRef.current, {
        center: [-34.6037, -58.3816],
        zoom: 12,
        zoomControl: false,
        minZoom: 4,
        maxZoom: 18,
      });

      map.attributionControl.setPosition('bottomleft');
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
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
      layerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !leafletRef.current || !mapRef.current || !layerRef.current) return;

    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    layer.clearLayers();

    points.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lon], {
        icon: L.divIcon({
          html: buildClientMarkerHtml(index),
          className: 'ufx-client-map-pin-shell',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          tooltipAnchor: [0, -20],
        }),
        title: `${point.name} · ${point.address}`,
      });

      marker.bindTooltip(buildClientTooltipHtml(point), {
        direction: 'top',
        opacity: 1,
        className: 'ufx-client-map-tooltip',
      });

      marker.on('click', () => onSelectPointRef.current(point.id));
      marker.addTo(layer);
    });

    if (points.length === 0) return;

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lon] as [number, number]));
    map.fitBounds(bounds.pad(0.18), {
      maxZoom: points.length === 1 ? 15 : 12,
      animate: false,
    });
  }, [mapReady, points]);

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-[28px] border border-slate-200 bg-[#fffaf4] shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
      <div ref={mapHostRef} className="ufx-client-history-map absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0)_48%,rgba(42,3,56,0.12))]" />
      <div className="absolute left-4 top-4 z-[420] inline-flex items-center gap-2 rounded-full border border-white/72 bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2a0338] shadow-[0_16px_36px_-24px_rgba(42,3,56,0.58)] backdrop-blur">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff8f1f] text-[#2a0338]">
          <MapPinned className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
        Mapa por zona
      </div>
      <div className="absolute bottom-3 left-3 right-3 z-[420] rounded-[18px] border border-white/72 bg-white/90 px-3 py-2 shadow-[0_16px_34px_-28px_rgba(42,3,56,0.62)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[#180f24]">Clientes por zona</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {points.length} {points.length === 1 ? 'ubicación confirmada' : 'ubicaciones confirmadas'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMap}
            className="rounded-full bg-[#2a0338] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#3a094a]"
          >
            Abrir mapa
          </button>
        </div>
      </div>
    </div>
  );
}
