// INSTRUCCIONES DE INTEGRACIÓN PARA TechnicianLocationPicker
// Archivo: apps/web/app/tecnicos/page.tsx

/* 
PASO 1: AGREGAR IMPORTS AL INICIO DEL ARCHIVO
========================================
Agrega estas dos líneas después de los otros imports:
*/

import TechnicianLocationPicker from '../../components/TechnicianLocationPicker';
import { parseTechnicianLocation, buildTechnicianLocation } from '../../lib/technician-location';

/*
PASO 2: AGREGAR NUEVO STATE PARA UBICACION
==========================================
Encuentra la línea donde se declara: const [profileForm, setProfileForm] = useState({...})

La ubicación actual es en el archivo, luego del estado [profile, setProfile]

Agrega este nuevo estado ANTES de profileForm:
*/

const [technicianLocationResult, setTechnicianLocationResult] = useState<{
  lat: number;
  lng: number;
  displayName: string;
  isValid: boolean;
  precision: 'exact' | 'approx';
} | null>(null);

/*
PASO 3: MODIFICAR EL PROFILEFORM STATE
======================================
El estado profileForm actual tiene estos campos. Al final de la definición, 
después de logoShape, agrega:
*/

logoShape: profile.logo_shape || 'auto',
// AGREGAR ESTOS:
locationPickerResult: null, // Se actualizará en useEffect

/*
PASO 4: ACTUALIZAR EL useEffect QUE CARGA EL PERFIL
====================================================
Encuentra el useEffect en línea ~1708 que termina con:
```
  }, [profile, session?.user?.email]);
```

Antes de la llave de cierre }, agrega DENTRO del useEffect, después de setCertificationFilesError:
*/

// Parse location from profile
const locationResult = parseTechnicianLocation(profile);
setTechnicianLocationResult(locationResult);

/*
PASO 5: ACTUALIZAR EL OBJETO setProfileForm
=============================================
En el mismo useEffect que el PASO 4, donde se llama setProfileForm({...}),
dentro del objeto, después de logoShape, agrega:

locationPickerResult: locationResult,

*/

/*
PASO 6: ENCONTRAR Y MODIFICAR persistProfile()
================================================
Busca la función: const persistProfile = async (...) => {

Dentro de esta función, donde hace el .update() a supabase profiles,
necesitas agregar estos campos al payload:
*/

service_lat: technicianLocationResult?.lat ?? null,
service_lng: technicianLocationResult?.lng ?? null,
service_location_name: technicianLocationResult?.displayName ?? null,
service_location_precision: technicianLocationResult?.precision ?? 'approx',
service_radius_km: COVERAGE_RADIUS_KM, // Ya existe esta constante

/*
PASO 7: RENDERIZAR EL COMPONENTE EN EL FORMULARIO
==================================================
Busca en el archivo la sección donde se renderiza el perfil.
Probablemente hay un tab activeTab === 'perfil'

Dentro de la sección de edición de perfil, después del campo de dirección/address,
agrega:
*/

<TechnicianLocationPicker
  value={technicianLocationResult}
  onChange={(result) => {
    setTechnicianLocationResult(result);
    // Trigger auto-save
    setProfilePersistTick(tick => tick + 1);
  }}
  label="Ubicación de trabajo (para perfil público)"
  description="Indica dónde trabajas. Los clientes te encontrarán en el mapa y sabrán tu zona de cobertura."
  required={profileForm.profilePublished} // Solo obligatorio si va a publicar
  error={!technicianLocationResult && profileForm.profilePublished ? 'Completa tu ubicación para publicar' : undefined}
/>

/*
PASO 8: VALIDACIÓN EN persistProfile
=====================================
En la función persistProfile, antes de hacer el upsert a Supabase, agrega validación:
*/

if (profileForm.profilePublished && !technicianLocationResult?.isValid) {
  throw new Error('Debes indicar tu ubicación para publicar en la vidriera.');
}

/*
PASO 9: UPDATE autoSaveSignature
================================
En el useMemo que calcula autoSaveSignature (aproximadamente línea ~4300),
agrega al objeto JSON que calcula la firma:
*/

technicianLocation: technicianLocationResult ? {
  lat: technicianLocationResult.lat,
  lng: technicianLocationResult.lng,
  displayName: technicianLocationResult.displayName,
  precision: technicianLocationResult.precision,
} : null,

/*
PASO 10: AGREGAR DEPENDENCIA A useEffect
=========================================
En el useEffect que depende de autoSaveSignature, asegúrate que technicianLocationResult
esté en la lista de dependencias. Búscalo y agrega a la lista si falta:

], [
  ...existentes...
  technicianLocationResult,  // AGREGAR
  ...
]);
*/

// ============================================
// RESUMEN DE CAMBIOS
// ============================================
/*

1. Imports: ✓ TechnicianLocationPicker, parseTechnicianLocation, buildTechnicianLocation
2. State: ✓ technicianLocationResult
3. ProfileForm: ✓ locationPickerResult field
4. useEffect profile loading: ✓ parseTechnicianLocation, setTechnicianLocationResult
5. persistProfile: ✓ Guardar service_lat, service_lng, service_location_name, service_location_precision
6. Render: ✓ TechnicianLocationPicker component
7. Validación: ✓ Validar si profilePublished
8. autoSaveSignature: ✓ Incluir technicianLocation
9. Dependencies: ✓ Agregar technicianLocationResult

Después de estos cambios:
- Los técnicos DEBEN cargar su ubicación correctamente
- Las coordenadas se guardan en service_lat y service_lng
- El mapa de vidriera las mostrará correctamente
- Solo aparecerán técnicos con ubicación válida en Argentina
*/
