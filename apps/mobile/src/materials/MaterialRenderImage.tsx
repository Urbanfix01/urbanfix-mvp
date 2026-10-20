import React, { useEffect, useState } from 'react';
import { Image, StyleProp, ImageStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CatalogRenderPreview } from './useCatalogRenders';

export default function MaterialRenderImage({ preview, name, style }: { preview?: CatalogRenderPreview; name: string; style: StyleProp<ImageStyle> }) {
  const [failed, setFailed] = useState<'published' | 'all' | null>(null);
  const uri = preview?.published?.uri;
  useEffect(() => setFailed(null), [uri, preview?.material?.id, preview?.revision, preview?.work?.model, preview?.work?.equipment]);
  const published = !!uri && !failed;
  const source = failed === 'all' ? undefined : published ? { uri } : preview?.fallback;
  return source ? <Image source={source} resizeMode="contain" style={style}
    accessibilityLabel={`${preview?.work ? 'Vista orientativa' : published ? 'Render publicado' : 'Render ilustrativo'} de ${name}`}
    onError={() => setFailed(published ? 'published' : 'all')} />
    : <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="cube-outline" size={24} color="#FF8F1F" /></View>;
}
