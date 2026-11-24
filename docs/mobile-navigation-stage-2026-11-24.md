# Cierre Mobile: Inicio y navegación integral

24 de noviembre de 2026. Código preparado en
`codex/mobile-navigation-2026-11-24`, sobre la base móvil `81b7bd5`.
El trabajo corresponde a MNAV-01 a MNAV-06, con revisión independiente en
Android e iOS. Ninguna comprobación física se da por finalizada con estas pruebas.

## Cambios

- Inicio con una pantalla recuperable si fallan las fuentes, la sesión o la
  consulta del perfil. Las operaciones del inicio tienen un límite de 12 segundos;
  reintentar no borra proyectos ni cierra la cuenta.
- Las respuestas anteriores no pueden sustituir un acceso más reciente ni el
  perfil de otra cuenta. Un error de red no se presenta como perfil incompleto.
- La preferencia de espacio se guarda por usuario. La selección de un acceso
  nuevo se vincula al usuario que realmente inició sesión; no concede permisos.
- Se conservan colores, iconos y las cinco entradas del profesional y cuatro del
  cliente. Atrás recorre el historial de pestañas. La barra contempla el teclado,
  tamaño de texto y área inferior; los laterales respetan las áreas seguras.
- Los accesos de Más mantienen los módulos nativos y distinguen las herramientas
  web. Evitan aperturas repetidas y permiten reintentar si falla el navegador.
  La sesión web es independiente; no se envían tokens para conectarla.
- Los enlaces de aplicación se limitan a rutas conocidas. Esperan al acceso y
  a completar el perfil; un cambio de cuenta descarta el enlace pendiente.
  Los enlaces de proyectos consultan el propietario y país actuales antes de
  abrir la ficha. Un enlace recibido no reemplaza el formulario que estaba abierto.
- Los retornos de autenticación y pagos no se interpretan como comandos de
  navegación. No se agregan dominios universales ni asociaciones de enlaces web.

## Comprobaciones de código

`npm run test:navigation` cubre 17 casos de sesión, almacenamiento por usuario,
cancelación, enlaces, historial y renderizado de los componentes reales de inicio
con adaptadores nativos y servicios aislados. Incluye errores, reintentos,
respuestas atrasadas y el menú Más. No accede a cuentas ni servicios reales.

La batería completa incluye 65 pruebas y la comprobación de tipos. Conserva las
pruebas existentes del editor, catálogo, mapas y proyectos. La exportación de
JavaScript/Hermes se verifica para Android e iOS; no equivale a un instalador
firmado, ejecución en teléfono o publicación.

```powershell
$env:URBANFIX_WEB_ROOT = '<checkout de Urbanfix01/urbanfix_web>'
npm run test:navigation
node --test tests/*.test.mjs
npm run typecheck
npx expo export --platform android --platform ios --output-dir dist/navigation-stage
```

## Verificación en teléfonos pendiente

El titular confirmó que dispone de Android e iPhone. La versión instalada debe
corresponder al commit y build exactos antes de registrar evidencia en Admin.
La última distribución documentada es 1.5.0 (Android 19 / iOS 38), anterior a
estos cambios. No utilizar esa entrega para aprobar este bloque.

| Punto | Recorrido que falta comprobar en cada plataforma |
| --- | --- |
| MNAV-01 | Arranque en frío, vuelta desde segundo plano, reinicio, falta de red y recuperación. |
| MNAV-02 | Cinco entradas del profesional, pestaña activa, historial y regreso desde pantallas internas. |
| MNAV-03 | Cuatro entradas del cliente; salir y cambiar de cuenta sin mostrar el otro espacio. |
| MNAV-04 | Abrir todos los accesos de Más y cerrar el navegador; comprobar explícitamente la cuenta web. |
| MNAV-05 | Enlaces `urbanfix://` o `urbanfix-preview://`, app abierta/cerrada, login pendiente y Atrás/gesto nativo. |
| MNAV-06 | Texto grande, teclado, desplazamiento y áreas de gestos. Comprobar la orientación vertical declarada y ventanas de tablet. |

Un teléfono conectado o una compilación terminada no cierran esos puntos.
Los acuerdos de Apple, Maps/push y la migración de servicios pendientes conservan
los límites documentados en [preparación móvil](mobile-readiness-2026-11-23.md).
No publicar en las tiendas con esos bloqueos.

## Candidatas de este bloque

El código probado y enviado a EAS corresponde a `2fe298d4b96fd31200807cf93ab9fd72219947f4`.
La rama está subida a GitHub; `main` del repositorio móvil conserva su estado
anterior. No se desplegó la web histórica ni una actualización OTA.

- **Android, UrbanFix Prueba 1.5.1 (1)**: build interno
  [`5f2158ac-ef21-47ee-ae6b-5fb56870beda`](https://expo.dev/accounts/urbanfix/projects/UrbanFix/builds/5f2158ac-ef21-47ee-ae6b-5fb56870beda),
  terminado. Identificador `com.urbanfix.app.preview`, separado de la app habitual.
  El APK descargado verifica su firma v2, nombre, versión, SDK mínimo 24 y
  target 36. No declara micrófono ni ubicación de fondo.
  SHA-256: `a3ddb0f970abc3a847602372c905653dd6702131a514545e058bb301bd972be6`.
- **iOS 1.5.1 (39)**: build
  [`72c8499d-7df2-43d5-9a9a-e9ee14cc02e3`](https://expo.dev/accounts/urbanfix/projects/UrbanFix/builds/72c8499d-7df2-43d5-9a9a-e9ee14cc02e3),
  terminado con la firma existente del identificador `com.urbanfix.urbanfix`.
  Es un archivo para App Store Connect, no un instalador directo. No se envió a
  TestFlight ni a revisión pública. La consulta de perfiles a Apple falló y EAS
  continuó con su validación local; el acceso y los acuerdos siguen sin confirmar.

Los builds se pidieron con `--freeze-credentials`, sin crear o renovar firmas.
No había credenciales de distribución interna para el identificador iOS de
pruebas; ese intento no generó instalador. La preparación inicializó el contador
de ese identificador en 1 y el candidato iOS habitual avanzó de 38 a 39.

El backend de Preview coincide con el proyecto de la web canónica. Los seis
criterios de navegación, para cada plataforma, se registraron en Admin como
**En trabajo** con la referencia al código y pruebas, sin versión/dispositivo
inventados ni cierres físicos. Los 257 registros del cierre web conservaron su
contenido; ninguna comprobación Mobile se marcó finalizada.

La prueba física de Android se solicitó al titular con el APK exacto y el modelo
y versión del teléfono. Hasta recibir resultados concretos, los puntos continúan
sin comprobar en ambos sistemas.
