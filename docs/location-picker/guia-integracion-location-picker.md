# Guia De Integracion De Location Picker

Autor: GitHub Copilot  
Fecha: 2026-03-25

Este documento resume la integracion del selector de ubicacion para tecnicos y deja el contexto tecnico en un formato legible.

## Archivos involucrados

1. apps/web/components/TechnicianLocationPicker.tsx
  Componente React con mapa interactivo, autocomplete de direcciones via Nominatim y validacion dentro de Argentina.
2. apps/web/lib/technician-location.ts
  Helpers para leer, construir y validar ubicacion tecnica.
3. apps/web/app/tecnicos/page.tsx
  Punto principal de integracion del flujo de guardado y publicacion.

## Puntos de integracion

1. Guardado de perfil
  En persistProfile se deben incluir service_lat, service_lng, service_location_name, service_location_precision y service_radius_km.
2. Validacion antes de publicar
  Si profilePublished es true y no hay una ubicacion valida, se debe rechazar la publicacion.
3. Render del selector
  El componente debe quedar en la seccion de perfil, junto a direccion, ciudad y cobertura.
4. Autosave
  autoSaveSignature debe incluir technicianLocationResult para detectar cambios de ubicacion.

## Fragmento clave de render

```tsx
<TechnicianLocationPicker
  value={technicianLocationResult}
  onChange={(result) => {
   setTechnicianLocationResult(result);
   setProfilePersistTick((prev) => prev + 1);
  }}
  label="Ubicacion de trabajo (para el mapa de tecnicos)"
  description="Donde trabajas. Los clientes te encontraran en el mapa interactivo."
  required={profileForm.profilePublished}
  error={
   profileForm.profilePublished && !technicianLocationResult?.isValid
    ? 'Completa tu ubicacion para publicar en la vidriera'
    : undefined
  }
/>
```

## Resultado esperado

1. Los tecnicos deben completar una ubicacion valida para publicar.
2. Las coordenadas se guardan en profiles.
3. La vidriera publica y el mapa ubican al tecnico en una posicion real.
4. El autosave detecta cambios de ubicacion sin pasos manuales extra.

## Estructura de base de datos esperada

La tabla profiles debe tener estas columnas:

- service_lat
- service_lng
- service_location_name
- service_location_precision
- service_radius_km

Si falta alguna, ejecutar la migracion documentada en [implementacion-completada.md](implementacion-completada.md).
