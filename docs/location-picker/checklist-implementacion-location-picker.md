# Checklist De Implementacion De Location Picker

Problema original: tecnicos con ubicacion incorrecta, nula o fuera de Argentina en el mapa publico.

## Archivos base

- apps/web/components/TechnicianLocationPicker.tsx
- apps/web/lib/technician-location.ts
- apps/web/app/tecnicos/page.tsx

## Checklist funcional

- Verificar imports de TechnicianLocationPicker y parseTechnicianLocation.
- Verificar estado technicianLocationResult.
- Verificar integracion del selector dentro del formulario de perfil.
- Verificar guardado de service_lat, service_lng, service_location_name, service_location_precision y service_radius_km.
- Verificar bloqueo de publicacion sin ubicacion valida.
- Verificar inclusion de technicianLocationResult en autosave.

## Checklist de base de datos

Ejecutar estas queries si la tabla profiles no tiene la estructura esperada:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_lat NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_lng NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_location_name VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_location_precision VARCHAR(20) DEFAULT 'approx';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC DEFAULT 20;

CREATE INDEX IF NOT EXISTS idx_profiles_service_location
ON profiles(service_lat, service_lng)
WHERE service_lat IS NOT NULL AND service_lng IS NOT NULL;
```

## Verificacion final

- npm run web:build
- npm run web:dev
- Abrir /tecnicos y comprobar que el tecnico puede seleccionar ubicacion.
- Publicar perfil solo con ubicacion valida.
- Abrir /vidriera y verificar posicion correcta en mapa.

## Soporte rapido

- Si technicianLocationResult no existe, revisar el useState y el parseo inicial.
- Si no se guarda en base de datos, revisar persistProfile y el schema de profiles.
- Si el mapa no responde, esperar la carga de Leaflet o recargar la pagina.
