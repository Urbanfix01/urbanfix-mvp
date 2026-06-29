'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import { addMalvinasArgentinaLabel } from '../lib/map-overlays';

export type TechnicianOperationalMapPoint = {
  id: string;
  kind: 'job' | 'request' | 'technician';
  title: string;
  subtitle: string;
  meta: string;
  lat: number;
  lon: number;
};

type Props = {
  points: TechnicianOperationalMapPoint[];
  selectedPointId?: string;
  fallbackCenter?: { lat: number; lon: number } | null;
  onSelectPoint: (pointId: string) => void;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildMarkerHtml = (selected: boolean) => `
  <div class="ufx-operational-map-pin ${selected ? 'is-selected' : ''}">
    <span class="ufx-operational-map-pin-shape"></span>
  </div>
`;

const buildClusterHtml = (count: number, selected: boolean) => `
  <div class="ufx-operational-map-cluster ${selected ? 'is-selected' : ''}">
    <span>${count}</span>
  </div>
`;

const buildTooltipHtml = (point: TechnicianOperationalMapPoint) => `
  <div class="ufx-operational-map-tooltip-card">
    <p class="ufx-operational-map-tooltip-title">${escapeHtml(point.title)}</p>
    <p class="ufx-operational-map-tooltip-meta">${escapeHtml(point.subtitle)}</p>
    <p class="ufx-operational-map-tooltip-subtle">${escapeHtml(point.meta)}</p>
  </div>
`;

type MapCluster = {
  id: string;
  points: TechnicianOperationalMapPoint[];
  lat: number;
  lon: number;
  projectedX: number;
  projectedY: number;
};

const getClusterDistancePx = (zoom: number) => {
  if (zoom <= 9) return 90;
  if (zoom <= 11) return 74;
  if (zoom <= 13) return 58;
  return 42;
};

export default function TechnicianOperationalMap({ points, selectedPointId = '', fallbackCenter, onSelectPoint }: Props) {
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
        center: [fallbackCenter?.lat || -34.6037, fallbackCenter?.lon || -58.3816],
        zoom: fallbackCenter ? 12 : 10,
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

      addMalvinasArgentinaLabel(L, map);

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

    const buildClusters = () => {
      const zoom = map.getZoom();
      if (zoom >= 15) {
        return points.map((point) => ({
          id: point.id,
          points: [point],
          lat: point.lat,
          lon: point.lon,
          projectedX: 0,
          projectedY: 0,
        }));
      }

      const distancePx = getClusterDistancePx(zoom);
      const clusters: MapCluster[] = [];

      points.forEach((point) => {
        const projected = map.project([point.lat, point.lon], zoom);
        const cluster = clusters.find((candidate) => {
          const dx = candidate.projectedX - projected.x;
          const dy = candidate.projectedY - projected.y;
          return Math.sqrt(dx * dx + dy * dy) <= distancePx;
        });

        if (!cluster) {
          clusters.push({
            id: point.id,
            points: [point],
            lat: point.lat,
            lon: point.lon,
            projectedX: projected.x,
            projectedY: projected.y,
          });
          return;
        }

        cluster.points.push(point);
        const size = cluster.points.length;
        cluster.lat = (cluster.lat * (size - 1) + point.lat) / size;
        cluster.lon = (cluster.lon * (size - 1) + point.lon) / size;
        cluster.projectedX = (cluster.projectedX * (size - 1) + projected.x) / size;
        cluster.projectedY = (cluster.projectedY * (size - 1) + projected.y) / size;
      });

      return clusters;
    };

    const renderMarkers = () => {
      layer.clearLayers();

      buildClusters().forEach((cluster) => {
        const selected = cluster.points.some((point) => point.id === selectedPointId);

        if (cluster.points.length > 1) {
          const requestCount = cluster.points.filter((point) => point.kind === 'request').length;
          const technicianCount = cluster.points.filter((point) => point.kind === 'technician').length;
          const displayCount = requestCount || technicianCount || cluster.points.length;
          const clusterLabel = technicianCount && !requestCount ? 'tecnicos cercanos' : 'solicitudes cercanas';
          const marker = L.marker([cluster.lat, cluster.lon], {
            icon: L.divIcon({
              html: buildClusterHtml(displayCount, selected),
              className: 'ufx-operational-map-cluster-shell',
              iconSize: [44, 44],
              iconAnchor: [22, 22],
            }),
            title: `${displayCount} ${clusterLabel}`,
          });

          marker.on('click', () => {
            map.flyTo([cluster.lat, cluster.lon], Math.min(map.getZoom() + 2, 16), {
              animate: true,
              duration: 0.35,
            });
          });
          marker.addTo(layer);
          return;
        }

        const point = cluster.points[0];
        const marker = L.marker([point.lat, point.lon], {
          icon: L.divIcon({
            html: buildMarkerHtml(selected),
            className: 'ufx-operational-map-pin-shell',
            iconSize: [34, 42],
            iconAnchor: [17, 42],
            tooltipAnchor: [0, -42],
          }),
          title: point.title,
        });

        marker.bindTooltip(buildTooltipHtml(point), {
          direction: 'top',
          opacity: 1,
          className: 'ufx-operational-map-tooltip',
        });

        marker.on('click', () => onSelectPointRef.current(point.id));
        marker.addTo(layer);
      });
    };

    renderMarkers();
    map.on('zoomend', renderMarkers);

    const selectedPoint = points.find((point) => point.id === selectedPointId);
    if (selectedPoint) {
      map.flyTo([selectedPoint.lat, selectedPoint.lon], Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.45,
      });
    } else if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lon] as [number, number]));
      map.fitBounds(bounds.pad(0.2), {
        maxZoom: points.length === 1 ? 15 : 13,
        animate: false,
      });
    } else if (fallbackCenter) {
      map.setView([fallbackCenter.lat, fallbackCenter.lon], 12, { animate: false });
    }

    return () => {
      map.off('zoomend', renderMarkers);
    };
  }, [fallbackCenter, mapReady, points, selectedPointId]);

  return <div ref={mapHostRef} className="ufx-operational-map h-full w-full" />;
}
