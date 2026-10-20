# Mapa operativo movil

## Problemas confirmados

El 20/10/2026 se verifico, sin autenticacion ni datos comerciales, que la ruta
antigua `GET /api/tecnico/requests/nearby` devuelve HTTP 200 con HTML en la web
actual. No es una respuesta de solicitudes. La ruta vigente
`/api/functions/supabase-technician-data` responde JSON y requiere POST autenticado.

La vista web anterior dibujaba una cuadricula decorativa, rutas ficticias y un
centro que no provenia del GPS. Ademas, `Number(null)` podia generar puntos en
`0,0`; seleccionar una solicitud no centraba la camara. Los comparadores de
memoizacion ignoraban cambios de callbacks y algunos cambios de marcadores.

## Correccion

- Consulta de solo lectura al workflow vigente, con sesion verificada antes y
  despues, timeout, cancelacion y cache separada por propietario.
- Respuestas HTML, incompletas o de otra cuenta son errores, no mapas vacios.
  Ante un error de actualizacion se conserva la ultima consulta valida.
- Solo estados activos; las solicitudes directas ajenas y duplicados se excluyen.
  Las respuestas y precios propios se cruzan con el ultimo match de la cuenta.
- Coordenadas exactas solo cuando las devuelve la API autorizada. En los demas
  casos se usan las coordenadas publicas aproximadas, identificadas en pantalla.
  No se geocodifican direcciones protegidas para eludir la privacidad del servidor.
- Sin coordenadas validas, la solicitud queda en la lista sin marcador. Los
  importes pendientes no se presentan como `$0`. Horario no informado se muestra
  sin confirmar; no se inventa disponibilidad ni distancia.
- Seleccion desde lista o marcador, centrado de camara y encuadre general, sin
  remontar el mapa con cada seleccion. En las pestanas de mapa se deshabilita el
  gesto global de cambio de pestana para no interferir con el desplazamiento.

La web usa [Leaflet 1.9.4](https://leafletjs.com/reference.html) empaquetado localmente.
La cartografia utiliza teselas HTTPS de OpenStreetMap con atribucion visible,
sin precarga masiva ni descargas offline. Se respetan las reglas de
[uso de teselas](https://operations.osmfoundation.org/policies/tiles/).
El mapa muestra error recuperable si la cartografia no carga.

Android/iOS conservan `react-native-maps`; Android requiere una clave de Google
Maps configurada en la compilacion. Esta correccion no crea claves ni publica
una nueva version de tienda. Requiere QA en dispositivos fisicos.

## Alcance y pruebas

La correccion cubre lectura, representacion y seleccion de solicitudes. No se
modificaron permisos, tarifas, presupuestos ni workflows de respuesta comercial.
Las pruebas usan cuentas y solicitudes simuladas, sin mutaciones sobre registros
reales. La comprobacion de cartografia real se hizo con ubicaciones de prueba.

```sh
node --test tests/operationalMap.test.mjs
node tests/operationalMap.browser.mjs
```

El recorrido requiere `PLAYWRIGHT_MODULE` y `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
Por defecto simula las teselas para no cargar servicios externos en cada prueba.
`MAP_LIVE_TILES=1` con `MAP_TEST_WIDTHS=390` verifica una unica vista real.
Las capturas quedan en `apps/mobile/dist/operational-map/` y no se versionan.

### Resultado del 20/10/2026

- 42 pruebas combinadas de mapa, tema, contrato del editor, proyectos y renders
  aprobadas; TypeScript sin errores.
- Recorrido del mapa aprobado en 320, 390 y 1440 px, incluyendo recuperacion de
  errores, seleccion desde la lista, privacidad y encabezado visible al enfocar.
- Cartografia real verificada una vez en 390 px con ubicaciones simuladas.
- Regresion de diseno, cotizacion e historial aprobada en 320, 390 y 1024 px.
- Exportacion de comprobacion Android e iOS aprobada. No equivale a compilacion
  de tienda ni prueba de GPS o del proveedor de mapas en dispositivos fisicos.
