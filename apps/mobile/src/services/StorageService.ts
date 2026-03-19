import { supabase } from '../lib/supabase'; // Asegúrate que esta ruta a tu cliente supabase sea correcta
import { decode } from 'base64-arraybuffer'; // Necesitarás instalar esto si no lo tienes, o usar fetch blob

/**
 * Sube una imagen al bucket de Supabase
 * @param uri - URI local de la imagen (file://...)
 * @param userId - ID del usuario (para crear la carpeta)
 * @param fileName - Nombre del archivo (ej: 'logo.png' o 'avatar.png')
 * @returns URL pública de la imagen
 */
export const uploadImageToSupabase = async (uri: string, userId: string, fileName: string) => {
  try {
    // 1. Convertir URI local a Blob
    // React Native maneja fetch a URIs locales para crear blobs
    const response = await fetch(uri);
    const blob = await response.blob();

    // 2. Definir ruta: userId/fileName (ej: "abc-123/logo.png")
    // Esto coincide con la política RLS que creamos en el Paso 1
    const filePath = `${userId}/${fileName}`;

    // 3. Subir a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('urbanfix-assets')
      .upload(filePath, blob, {
        contentType: 'image/png', // Asumimos PNG/JPG
        upsert: true, // Si existe, lo sobrescribe
      });

    if (uploadError) {
      throw uploadError;
    }

    // 4. Obtener URL Pública
    const { data } = supabase.storage
      .from('urbanfix-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;

  } catch (error) {
    console.error('Error subiendo imagen:', error);
    throw error;
  }
};