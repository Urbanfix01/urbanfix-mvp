# Cierre Mobile: Inicio y navegación integral

24 de noviembre de 2026. Código preparado en
`codex/mobile-navigation-2026-11-24`, sobre la base móvil `81b7bd5`.
El trabajo corresponde a MNAV-01 a MNAV-06, con revisión independiente en
Android e iOS. Las pruebas de código no completan una comprobación física.
MNAV-01 y MNAV-02 en iOS se cerraron después con las confirmaciones del titular
detalladas abajo.

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

## Verificación en teléfonos

El titular confirmó que dispone de Android e iPhone. La versión instalada debe
corresponder al commit y build exactos antes de registrar evidencia en Admin.
La distribución anterior era 1.5.0 (Android 19 / iOS 38), sin estos cambios.
No utilizar esa entrega para aprobar este bloque. Las candidatas actuales y el
resultado parcial de iPhone se detallan más abajo.

| Punto | Recorrido y estado de la comprobación física |
| --- | --- |
| MNAV-01 | iOS cerrado para arranque, segundo plano, reinicio y recuperación; consulta de datos sin red pendiente en MSEG-03. Android pendiente. |
| MNAV-02 | iOS cerrado para las cinco entradas profesionales, pestaña activa y regreso desde un proyecto. Android pendiente. |
| MNAV-03 | Cuatro entradas del cliente; salir y cambiar de cuenta sin mostrar el otro espacio. |
| MNAV-04 | Abrir todos los accesos de Más y cerrar el navegador; comprobar explícitamente la cuenta web. |
| MNAV-05 | Enlaces `urbanfix://` o `urbanfix-preview://`, app abierta/cerrada, login pendiente y Atrás/gesto nativo. |
| MNAV-06 | Texto grande, teclado, desplazamiento y áreas de gestos. Comprobar la orientación vertical declarada y ventanas de tablet. |

Un teléfono conectado o una compilación terminada no cierran esos puntos.
Maps/push y la migración de servicios pendientes conservan los límites
documentados en [preparación móvil](mobile-readiness-2026-11-23.md).
El acceso y envío interno a Apple se comprobaron después, como se detalla abajo.
No publicar en las tiendas con los bloqueos funcionales pendientes.

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
  Es un archivo para App Store Connect, no un instalador directo. Al compilar,
  la consulta de perfiles a Apple falló y EAS continuó con su validación local.
  El acceso se comprobó después y esta candidata ya está disponible en el grupo
  interno de TestFlight, como se detalla abajo.

Los builds se pidieron con `--freeze-credentials`, sin crear o renovar firmas.
No había credenciales de distribución interna para el identificador iOS de
pruebas; ese intento no generó instalador. La preparación inicializó el contador
de ese identificador en 1 y el candidato iOS habitual avanzó de 38 a 39.

El backend de Preview coincide con el proyecto de la web canónica. Los seis
criterios de navegación, para cada plataforma, se registraron en Admin como
**En trabajo** con la referencia al código y pruebas, sin versión/dispositivo
inventados ni cierres físicos. Los 257 registros del cierre web conservaron su
contenido; en ese registro inicial ninguna comprobación Mobile se marcó finalizada.

La prueba física de Android se solicitó al titular con el APK exacto y el modelo
y versión del teléfono; todavía no se recibió su resultado. En iPhone se recibió
la confirmación del recorrido de arranque y recuperación detallada abajo.

## Entrega interna de iPhone

El titular confirmó la revisión del acceso y los acuerdos de Apple y autorizó
continuar con el envío. Se cargó únicamente la candidata anterior, sin generar
otra compilación ni cambiar firmas o permisos.

- Envío EAS
  [`071a6604-92d1-49ee-ba25-e600238cc9a0`](https://expo.dev/accounts/urbanfix/projects/UrbanFix/submissions/071a6604-92d1-49ee-ba25-e600238cc9a0):
  **FINISHED**, 24/11/2026 a las 08:15:56 de Argentina (11:15:56 UTC), sin error
  de acuerdos de Apple.
- App Store Connect: app `6758969211`, build
  `56dea029-57cc-446d-b310-11070fa3529c`, **1.5.1 (39)**. La consulta posterior
  confirmó `processingState: VALID`, `internalState: IN_BETA_TESTING`,
  `expired: false` y `usesNonExemptEncryption: false`.
- El grupo interno existente **BETA TESTER** incluye esta compilación y la cuenta
  `info@urbanfixar.com`. Mantiene su acceso automático a los builds; no se crearon
  grupos ni se enviaron invitaciones adicionales. El estado histórico del tester
  `INSTALLED` no acredita que haya instalado la versión 39.
- No se solicitó revisión externa de TestFlight ni publicación en App Store.
  El estado externo es `READY_FOR_BETA_SUBMISSION`.
- Apple envió el aviso **ITMS-90725**: la entrega usa el SDK iOS 26.0 y el correo
  anuncia el requisito de iOS 27/Xcode 27 a partir de abril de 2027. Esta entrega
  fue aceptada; registrar la actualización de SDK para una futura compilación.

El intento inicial de adjuntar notas de prueba fue rechazado por una limitación
del plan de EAS antes de programar el envío. Se retiró esa opción y se completó
el único envío anterior; no se cambió el plan ni se duplicó la compilación.

El titular confirmó la instalación de **1.5.1 (39)** y el resultado registrado
a continuación. **MNAV-01 y MNAV-02 / iOS están Finalizados**. MNAV-03 a
MNAV-06 en iOS siguen **En trabajo**; las filas de Android conservan su estado.

## Comprobación de arranque en iPhone

El 24/11/2026 el titular informó en este chat que instaló **1.5.1 (39)**, que la
app abre bien y que regresa correctamente desde segundo plano. Indicó
**iPhone 13 con iOS 27.2.1**. Tanto el equipo como la versión de sistema son datos
aportados por el titular; no se consultaron directamente en el dispositivo.

Después confirmó que los cuatro pasos adicionales funcionaron y pidió cerrar
MNAV-01 en iOS: cierre completo y reapertura, inicio en modo avión con Wi-Fi
apagado, restablecimiento de Internet y reintento si correspondía, y reinicio del
iPhone seguido de nueva apertura. Aclaró expresamente que **sin datos ni Wi-Fi
no puede consultar la información de la app**. El cierre acredita arranque y
recuperación; no acredita consulta ni trabajo sin conexión.

| Recorrido de MNAV-01 en iOS | Resultado disponible |
| --- | --- |
| Instalación de 1.5.1 (39) desde TestFlight | Correcta, informada por el titular. |
| Apertura de la app | Correcta, informada por el titular. |
| Regreso desde segundo plano | Correcto, informado por el titular. |
| Cierre completo y nueva apertura | Correctos, informados por el titular. |
| Reinicio del iPhone y nueva apertura | Correctos, informados por el titular. |
| Inicio sin conexión y recuperación al restablecer Internet | El recorrido de recuperación funcionó, según el titular; sin conexión no puede consultar la información. |

Se registraron versión, dispositivo, fuente, alcance y salvedad en
**MNAV-01 / iOS**, que quedó **Finalizado** por solicitud expresa del titular.
No se atribuye el resultado a Android ni a los demás recorridos de navegación.

## Observación abierta de uso sin conexión

La falta de consulta de información sin datos móviles ni Wi-Fi se registró en
Admin bajo **MSEG-03 / iOS — Trabajo sin conexión y conflictos**, como
**Pendiente**, con la versión y el equipo informados. Se solicitó distinguir si
la pantalla de inicio bloquea el acceso al panel, si el panel abre pero no carga
los datos, o si queda una pantalla vacía o cargando. La causa no está confirmada.

La observación no sustituye los demás ensayos de ese criterio: interrumpir la red
al guardar, reintentar, comprobar otro dispositivo y resolver conflictos sin
sobrescribir trabajo. No se declaró lectura o edición offline aprobada ni se
modificó la app para resolverla en esta actualización del registro.

## Comprobación de navegación profesional en iPhone

El 24/11/2026, ante el recorrido solicitado con Internet activo
**Proyectos → Dashboard → Orden del día → Mapa operativo → Más → Proyectos**,
comprobación de pestaña activa y apertura de un proyecto existente con regreso
mediante Atrás conservando cuenta y lista, el titular respondió «todo funciona
Bien». Corresponde a la misma **1.5.1 (39)** y al **iPhone 13 con iOS 27.2.1**
informados para este bloque; no hubo observación remota del agente.

Se registró la confirmación y se cerró **MNAV-02 / iOS**. No se extrapola a cada
herramienta del menú Más, navegación cliente, todos los enlaces internos o
consulta sin conexión. MSEG-03 sigue **Pendiente** con la observación anterior.

## Próximo recorrido: MNAV-03 en iOS

Con Internet activo y una cuenta de Cliente disponible, recorrer
**Solicitudes → Publicar → Mapa → Perfil**, comprobar pestaña activa y regreso
sin mostrar los datos del profesional. Volver a la cuenta profesional y
comprobar que conserva su espacio. Se puede abrir Publicar sin enviar una
solicitud. El resultado todavía no fue informado; **MNAV-03 sigue En trabajo**.
