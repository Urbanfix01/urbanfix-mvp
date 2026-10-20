import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { COLORS, FONTS } from '../../utils/theme';
import { MapCanvasProps } from '../../types/maps';
import { DEFAULT_MAP_REGION, mapCoordinate } from '../../utils/mapGeometry';

type Context = { map: Leaflet.Map; layers: Leaflet.LayerGroup; tiles: Leaflet.TileLayer; library: typeof Leaflet; markers: Map<string, Leaflet.Marker>; fit(): void };
const MapCanvas = (props: MapCanvasProps) => {
  const { points, region, formatMoney, height = 220, valuePrefix = '$', selectedId, focusKey } = props;
  const host = useRef<HTMLDivElement>(null), context = useRef<Context | null>(null), current = useRef(props);
  current.current = props;
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [tilesFailed, setTilesFailed] = useState(false);
  useEffect(() => {
    let cancelled = false, observer: ResizeObserver | undefined;
    void import('leaflet').then((library) => {
      if (cancelled || !host.current) return;
      const map = library.map(host.current, { scrollWheelZoom: false }).setView([DEFAULT_MAP_REGION.latitude, DEFAULT_MAP_REGION.longitude], 11);
      const tiles = library.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' }).addTo(map);
      let tileErrors = 0;
      tiles.on('loading', () => { tileErrors = 0; });
      tiles.on('tileerror', () => { tileErrors++; if (!cancelled) setTilesFailed(true); });
      tiles.on('load', () => { if (!cancelled) setTilesFailed(tileErrors > 0); });
      const ctx: Context = { map, tiles, library, layers: library.layerGroup().addTo(map), markers: new Map(), fit() {
        const rows = current.current.points.filter((point) => mapCoordinate(point.lat, point.lng));
        const center = mapCoordinate(current.current.region.latitude, current.current.region.longitude) || { lat: DEFAULT_MAP_REGION.latitude, lng: DEFAULT_MAP_REGION.longitude };
        if (rows.length > 1) map.fitBounds(library.latLngBounds(rows.map((point) => [point.lat, point.lng])), { padding: [30, 30], maxZoom: 15, animate: false });
        else if (rows.length === 1) map.setView([rows[0].lat, rows[0].lng], 14, { animate: false });
        else map.setView([center.lat, center.lng], 11, { animate: false });
      } };
      context.current = ctx;
      let sized = false;
      observer = new ResizeObserver(() => { if (!host.current?.clientWidth || !host.current.clientHeight) return; map.invalidateSize({ pan: false }); if (!sized) { ctx.fit(); sized = true; } });
      observer.observe(host.current);
      setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; observer?.disconnect(); context.current?.map.remove(); context.current = null; };
  }, []);
  useEffect(() => {
    const ctx = context.current; if (!ready || !ctx) return;
    ctx.layers.clearLayers(); ctx.markers.clear();
    for (const point of points) {
      if (!mapCoordinate(point.lat, point.lng)) continue;
      const dot = document.createElement('span');
      const color = /^#[\da-f]{3,8}$/i.test(point.status.color) ? point.status.color : COLORS.brand;
      Object.assign(dot.style, { display: 'block', width: '20px', height: '20px', margin: '12px', borderRadius: '50%', background: color, border: '3px solid white', boxShadow: '0 2px 6px #0006' });
      const marker = ctx.library.marker([point.lat, point.lng], { keyboard: true, title: point.title, icon: ctx.library.divIcon({ html: dot, className: 'urbanfix-map-marker', iconSize: [44, 44], iconAnchor: [22, 22] }) });
      const popup = document.createElement('div'), title = document.createElement('strong'), status = document.createElement('p');
      title.textContent = point.title;
      status.textContent = `${point.status.label} · ${point.amountLabel || `${valuePrefix}${formatMoney(point.amount)}`}`;
      popup.append(title, status);
      marker.bindPopup(popup).on('click', () => current.current.onSelect(point)).addTo(ctx.layers);
      marker.getElement()?.setAttribute('aria-label', `Ver en mapa: ${point.title}`);
      ctx.markers.set(point.id, marker);
    }
    ctx.fit();
  }, [ready, points, region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta, formatMoney, valuePrefix]);
  useEffect(() => {
    const ctx = context.current; if (!ready || !ctx) return;
    for (const [id, marker] of ctx.markers) marker.setZIndexOffset(id === selectedId ? 1000 : 0);
    const marker = selectedId ? ctx.markers.get(selectedId) : null;
    if (marker) { ctx.map.setView(marker.getLatLng(), Math.max(ctx.map.getZoom(), 14), { animate: false }); marker.openPopup(); }
    else ctx.map.closePopup();
  }, [ready, selectedId, focusKey, points]);
  return <View style={[styles.shell, { height }]}>
    <div ref={host} role="region" aria-label="Mapa geografico de solicitudes" style={{ height: '100%', width: '100%', minHeight: 140 }} />
    {!ready && !failed && <View pointerEvents="none" style={styles.loading}><Text style={styles.message}>Cargando mapa...</Text></View>}
    {failed && <View style={styles.loading}><Text accessibilityRole="alert" style={styles.message}>No se pudo iniciar el mapa. Las solicitudes siguen disponibles en la lista.</Text></View>}
    {ready && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Encuadrar solicitudes" onPress={() => { context.current?.map.closePopup(); context.current?.fit(); }} style={styles.fit}><Ionicons name="scan-outline" size={22} color={COLORS.brand} /></TouchableOpacity>}
    {tilesFailed && <View style={styles.warning}><Text style={styles.message}>No se pudo cargar la cartografia.</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Reintentar cartografia" onPress={() => context.current?.tiles.redraw()} style={styles.retry}><Ionicons name="refresh" size={20} color={COLORS.brand} /></TouchableOpacity></View>}
  </View>;
};
export default memo(MapCanvas);
const styles = StyleSheet.create({
  shell: { position: 'relative', overflow: 'hidden', borderRadius: 12, backgroundColor: COLORS.surfaceMuted },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: COLORS.surfaceMuted },
  fit: { position: 'absolute', zIndex: 500, right: 10, top: 10, width: 44, height: 44, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  warning: { position: 'absolute', zIndex: 500, bottom: 24, left: 8, right: 8, backgroundColor: COLORS.accentSoft, paddingLeft: 10, flexDirection: 'row', alignItems: 'center' },
  message: { flexShrink: 1, fontFamily: FONTS.body, fontSize: 12, color: COLORS.text },
  retry: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
});
