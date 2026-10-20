import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { BORDER, INK, TEAL, ui } from './ProjectUI';

export default function ProjectPlanPreview({ draft }: { draft: Record<string, any> }) {
  const width = Number(draft.settings?.lotWidth), depth = Number(draft.settings?.lotDepth);
  if (draft.kind !== 'house-drawing' || draft.version !== 1 || !Number.isFinite(width) || !Number.isFinite(depth) || width < 1 || depth < 1 || width > 100 || depth > 100) return <Text style={ui.muted}>Vista previa disponible en el editor correspondiente.</Text>;
  const walls = Array.isArray(draft.walls) ? draft.walls.slice(0, 200).filter((wall: any) => [wall?.a, wall?.b].every((p) => Array.isArray(p) && p.length === 2 && p.every((n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100))) : [];
  const xs = [0, width, ...walls.flatMap((wall: any) => [wall.a[0], wall.b[0]])], ys = [0, depth, ...walls.flatMap((wall: any) => [wall.a[1], wall.b[1]])];
  const minX = Math.min(...xs), minY = Math.min(...ys), spanX = Math.max(...xs) - minX, spanY = Math.max(...ys) - minY, margin = Math.max(spanX, spanY) * .08;
  return <View accessibilityLabel={`Plano de referencia, terreno ${width} por ${depth} metros`} style={{ height: 220, backgroundColor: '#edf3f4', borderWidth: 1, borderColor: BORDER, marginVertical: 12 }}>
    <Svg width="100%" height="100%" viewBox={`${minX - margin} ${minY - margin} ${spanX + 2 * margin} ${spanY + 2 * margin}`}>
      <Rect x={0} y={0} width={width} height={depth} fill="#e3f1ee" stroke={TEAL} strokeWidth={Math.max(spanX, spanY) / 350} strokeDasharray={`${margin / 3} ${margin / 3}`} />
      {walls.map((wall: any, index: number) => <Line key={wall.id || index} x1={wall.a[0]} y1={wall.a[1]} x2={wall.b[0]} y2={wall.b[1]} stroke={INK} strokeWidth={Number(wall.thickness) > 0 && Number(wall.thickness) < 1 ? wall.thickness : .18} strokeLinecap="square" />)}
    </Svg>
  </View>;
}
