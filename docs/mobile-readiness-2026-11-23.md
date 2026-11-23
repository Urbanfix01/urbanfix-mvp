# Preparación móvil 1.5.1 — 23/11/2026

Estado: trabajo en curso. Esta preparación no es un instalador firmado, una
actualización OTA, un envío a tiendas ni una comprobación en teléfono.

## Fuente y límites

Repositorio nativo `Urbanfix01/urbanfix-mvp`, rama
`codex/mobile-ready-2026-11-23`, partiendo de `ae55955`.
Web canónica consultada: `940c61bb447e5df96cee8d786f116c2b274ad182`.
La rama nativa está cinco commits por delante de `origin/main`; no sustituirla
por la antigua web de `apps/web` ni desplegar esa web.

El titular confirmó que dispone ahora de Android e iPhone. No hay un Android
conectado por ADB en esta sesión. Disponibilidad del dispositivo no equivale a
instalación comprobada.

## Cambios preparados

- Editor empaquetado regenerado desde los 75 insumos de la web actual,
  conservando modelos, coeficientes y valores de referencia; no se publican tarifas.
- Identidad de fuentes compatible con LF/CRLF entre Windows y builders.
  Los hashes de fuentes normalizan finales de línea; fuentes binarias y HTML
  conservan su hash exacto. El manifiesto declara `text-lf-v1`.
- Sesión nativa: refresco al volver al primer plano, pausa en segundo plano y
  retirada del listener al desmontar. Se usa el bloqueo de sesión del SDK.
- Catálogo: operación controlada y paginada para materiales y mano de obra,
  sin lectura directa de la tabla ni fallback que salte permisos. El catálogo
  general mantiene Argentina; el editor sigue usando el país de cada proyecto.
- Baja: el servicio vigente `account-workflow/request_deletion` debe confirmar
  una solicitud. Ambos perfiles dicen “Solicitar eliminación”, explican que no
  es inmediata y conservan la sesión para consultar el estado. No se afirma
  que el usuario haya sido borrado.
- Cliente y profesional rechazan respuestas HTML/vacías en los adaptadores
  antiguos. Publicar comprueba el servicio antes de subir fotos.
- Más incorpora accesos claramente identificados a herramientas web,
  preferencias, soporte y legales. No se transfieren tokens al navegador.
  El perfil de cliente también permite abrir privacidad, términos y el estado
  de su solicitud de baja.
- Permisos de cámara/fotos en español. Micrófono bloqueado y ubicación en
  segundo plano desactivada. Plugin de notificaciones declarado.
- Parches compatibles de Expo 54, Constants y FileSystem; EAS CLI fijado a
  27.11.0. La revisión npm posterior a actualizar shell-quote y EAS informa
  cero críticas, 14 altas, 27 moderadas y dos bajas; quedan dependencias por
  revisar antes de producción. No se ejecutó `audit fix --force`.

- Se desactiva el despliegue automático de la web histórica desde este repositorio móvil. El workflow archivado solo informa cuál es el repositorio web canónico; no utiliza credenciales ni publica.

## Comprobaciones

- 48 pruebas unitarias/contratos pasan, sin omisiones, con
  `URBANFIX_WEB_ROOT` apuntando a la web canónica. Incluyen propiedad/cambio
  de cuenta, paginación, rechazo de respuestas incompatibles, solicitud de
  baja, ciclo de sesión, integridad y paridad del editor.
- Comprobación de tipos y compatibilidad de dependencias Expo.
- Exportación JavaScript/Hermes Android e iOS. No acredita firma, SDK nativo
  compilado, instalación ni ejecución en dispositivo.
- Inspección de configuración nativa: identificadores de producción conservados,
  versión 1.5.1, textos de permisos y ausencia de micrófono/ubicación de fondo.
- Revisión visual pendiente. El arranque con variables de prueba fue rechazado
  por la revisión automática de ejecución; el intento con servicio ficticio
  también fue rechazado, sin motivo específico. No se declara aprobada una
  prueba visual ni se elude ese bloqueo.
- Sin migraciones de Supabase, cambios de permisos de usuarios, datos de
  clientes, firmas, variables remotas o acuerdos legales.

## Bloqueos para una entrega completa

1. **Servicios antiguos de clientes y profesional.** En lectura real,
   `GET /api/client/requests`, `/api/client/technicians/map` y
   `/api/tecnico/dashboard/billing` responden HTML 200; sus POST antiguos
   responden 405. No son el servicio JSON vigente. Falta migrar solicitudes,
   propuestas, mapas públicos y facturación a los workflows actuales y verificar
   cada contrato. El guardado de presupuestos antiguo también usa escrituras/RPC
   previas; requiere prueba específica, no inferir compatibilidad de la sesión.
2. **Fotos de solicitudes.** El formulario antiguo usa `urbanfix-assets`
   público. Antes de habilitar su entrega, migrar a `urbanfix-private`, metadatos
   verificados, consentimiento explícito y creación idempotente que exige
   `request-workflow`. La nueva comprobación previa evita subir cuando el
   servicio antiguo devuelve HTML; no se presenta como migración completa.
3. **Android Maps/push.** No se encontró clave Android de Maps entre las
   variables del proyecto Expo en producción. Verificar también la configuración
   de Firebase/FCM, archivo de servicios y credenciales push. No reutilizar una
   clave web ni ampliar restricciones. Probar mapa y notificaciones en dispositivo.
4. **Apple.** Último antecedente: envío TestFlight bloqueado por acuerdos.
   El titular informó que no puede acceder ahora; el estado actual del acuerdo sigue sin confirmar. No se aceptaron términos.
5. **Revisión de seguridad y plataforma.** Completar actualización compatible de
   dependencias pendientes, validación de SDK/target de las tiendas, políticas,
   declaraciones de datos y cuentas de revisión antes de un envío público.
6. **Pruebas físicas.** Instalar un nuevo build exacto y probar ambas audiencias,
   acceso/Apple/Google, aislamiento por cuenta, guardado/reinicio, fotos privadas,
   permisos denegados/permitidos, Maps, notificaciones y compartir archivos.
   Los pagos reales continúan pendientes.

## Expo leído en esta sesión

Sesión `urbanfix` y proyecto existente accesibles. Los builds más recientes
siguen siendo Android 1.5.0 (19), `d25ade25-ad6e-4cc4-8b7d-87801127be5b`,
e iOS 1.5.0 (38), `f4e1b9c2-2e02-45fd-b3b0-df9a700cf7c8`, ambos terminados
el 20/10. Consultar builds no confirma su distribución actual en las tiendas.

No generar una entrega pública con los bloqueos anteriores. La etapa siguiente
es migrar el recorrido de solicitudes y fotos, completar el resto de contratos,
resolver Maps/Apple y recién entonces generar builds de prueba para los teléfonos.

Referencias: [sesión React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native),
[builds Expo](https://docs.expo.dev/build/setup/),
[envío iOS](https://docs.expo.dev/submit/ios/).
