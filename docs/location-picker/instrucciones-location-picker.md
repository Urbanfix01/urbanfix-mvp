# Instrucciones De Integracion De TechnicianLocationPicker

Archivo objetivo principal: apps/web/app/tecnicos/page.tsx

## Paso 1

Agregar imports:

```tsx
import TechnicianLocationPicker from '../../components/TechnicianLocationPicker';
import { parseTechnicianLocation, buildTechnicianLocation } from '../../lib/technician-location';
```

## Paso 2

Agregar el estado de ubicacion antes de profileForm:

```tsx
const [technicianLocationResult, setTechnicianLocationResult] = useState<{
  lat: number;
  lng: number;
  displayName: string;
  isValid: boolean;
  precision: 'exact' | 'approx';
} | null>(null);
```

## Paso 3

Extender profileForm con locationPickerResult.

```tsx
logoShape: profile.logo_shape || 'auto',
locationPickerResult: null,
```

## Paso 4

Al cargar el perfil, parsear la ubicacion existente:

```tsx
const locationResult = parseTechnicianLocation(profile);
setTechnicianLocationResult(locationResult);
```

Y dentro de setProfileForm agregar:

```tsx
locationPickerResult: locationResult,
```

## Paso 5

En persistProfile incluir estos campos:

```tsx
service_lat: technicianLocationResult?.lat ?? null,
service_lng: technicianLocationResult?.lng ?? null,
service_location_name: technicianLocationResult?.displayName ?? null,
service_location_precision: technicianLocationResult?.precision ?? 'approx',
service_radius_km: COVERAGE_RADIUS_KM,
```

## Paso 6

Renderizar el componente dentro del formulario de perfil:

```tsx
<TechnicianLocationPicker
  value={technicianLocationResult}
  onChange={(result) => {
    setTechnicianLocationResult(result);
    setProfilePersistTick((tick) => tick + 1);
  }}
  label="Ubicacion de trabajo (para perfil publico)"
  description="Indica donde trabajas. Los clientes te encontraran en el mapa y sabran tu zona de cobertura."
  required={profileForm.profilePublished}
  error={!technicianLocationResult && profileForm.profilePublished ? 'Completa tu ubicacion para publicar' : undefined}
/>
```

## Paso 7

Validar antes del guardado:

```tsx
if (profileForm.profilePublished && !technicianLocationResult?.isValid) {
  throw new Error('Debes indicar tu ubicacion para publicar en la vidriera.');
}
```

## Paso 8

Incluir la ubicacion en autoSaveSignature:

```tsx
technicianLocation: technicianLocationResult
  ? {
      lat: technicianLocationResult.lat,
      lng: technicianLocationResult.lng,
      displayName: technicianLocationResult.displayName,
      precision: technicianLocationResult.precision,
    }
  : null,
```

Y agregar technicianLocationResult a las dependencias del useMemo o useEffect correspondiente.

## Resultado esperado

- Los tecnicos cargan la ubicacion correctamente.
- service_lat y service_lng quedan persistidos.
- El mapa de la vidriera usa coordenadas validas en Argentina.
- La publicacion exige una ubicacion valida.
