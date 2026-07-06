# Publicacion mobile en tiendas

Este documento resume el estado y el flujo para publicar UrbanFix en tiendas.

## Estado actual

- App: UrbanFix
- Android package: `com.urbanfix.app`
- iOS bundle id: `com.urbanfix.urbanfix`
- Version visible: `1.4.5`
- Android versionado: remoto por EAS
- Android versionCode remoto detectado: `17`
- Android build de produccion disponible: `47eec56c-2027-4186-9703-f7cd1fb2d886`
- Google Play prueba abierta: version Android `1.4.5` activa en 177 paises o regiones
- iOS versionado: remoto por EAS
- iOS buildNumber remoto detectado: `29`
- Google Play: produccion habilitada, produccion inactiva hasta subir una release
- App Store: configuracion iOS conectada con `ascAppId` y lista para build de TestFlight/App Store Connect
- IARC Google Play: calificacion en vivo emitida el 5 de julio de 2026
- IARC Global Rating ID: `6f4278bb-8a11-81d1-8130-3f5ad6f8e87b`

## Cambios de configuracion listos

- `apps/mobile/eas.json`
  - `submit.production.android.track` apunta a `production`.
  - `submit.playstore` hereda de `production`.
  - `build.production.android.buildType` genera `app-bundle`.
- `apps/mobile/app.json`
  - Android ya no declara `versionCode` local, porque EAS maneja el versionado remoto.
  - iOS ya no declara `buildNumber` local, porque EAS maneja el versionado remoto.
- `package.json`
  - `npm run mobile:android:production` genera el AAB de produccion.
  - `npm run mobile:android:submit` envia el build a Google Play usando el perfil de produccion.
  - `npm run mobile:ios:production` genera el build iOS de produccion para App Store Connect.
  - `npm run mobile:ios:submit` envia el build iOS a App Store Connect.

## Verificaciones locales

```bash
npm run mobile:typecheck
```

Resultado esperado: sin errores TypeScript.

## Flujo Android recomendado

1. Confirmar que Play Console tiene completa la ficha:
   - nombre de app;
   - descripcion corta;
   - descripcion completa;
   - categoria;
   - email de soporte;
   - politica de privacidad;
   - capturas;
   - grafico destacado.
2. Generar build Android de produccion:

```bash
npm run mobile:android:production
```

3. Revisar el resultado del build en EAS.
4. Cuando el AAB este correcto, recien ahi enviar a Google Play:

```bash
npm run mobile:android:submit
```

5. En Play Console, revisar la release y enviarla a revision.

No ejecutar el submit sin revisar antes el build y confirmar que se quiere mandar a revision.

## Flujo Android actual recomendado

Como la version `1.4.5` con codigo `17` ya esta publicada en prueba abierta, el siguiente paso recomendado es promover esa misma version a produccion desde Google Play Console:

1. Ir a `Probar y publicar`.
2. Entrar en `Produccion`.
3. Crear una nueva version de produccion.
4. Elegir la opcion de agregar o promover desde una version existente.
5. Seleccionar `UrbanFix Android 1.4.5` / codigo `17`.
6. Revisar paises, notas de version y declaracion de privacidad.
7. Enviar los cambios a revision.

Solo generar un nuevo AAB si hubo cambios de app que deban entrar en la tienda.

## Flujo iOS recomendado

1. Confirmar que App Store Connect tiene completa la ficha:
   - nombre de app;
   - categoria;
   - politica de privacidad;
   - soporte;
   - capturas para iPhone;
   - datos de privacidad;
   - informacion de revision.
2. Generar build iOS de produccion:

```bash
npm run mobile:ios:production
```

3. Revisar el resultado del build en EAS.
4. Cuando el build este correcto, enviarlo a App Store Connect:

```bash
npm run mobile:ios:submit
```

5. En App Store Connect, esperar procesamiento del build.
6. Agregar el build a TestFlight para prueba interna.
7. Si TestFlight interno funciona, completar la version de App Store y enviarla a revision.

No ejecutar el submit sin revisar antes el build y confirmar que se quiere mandar a App Store Connect.

## Datos publicos ya disponibles

- Politica de privacidad: `https://www.urbanfix.com.ar/privacidad`
- Terminos: `https://www.urbanfix.com.ar/terminos`
- Eliminacion de cuenta: `https://www.urbanfix.com.ar/eliminar-cuenta`
- Soporte: `https://www.urbanfix.com.ar/soporte`

## Assets detectados

- Icono mobile: `apps/mobile/assets/icon.png` - 2048 x 2048
- Adaptive icon: `apps/mobile/assets/adaptive-icon.png` - 2048 x 2048
- Splash: `apps/mobile/assets/splash-icon.png` - 2048 x 2048
- Feature graphic Play Store: `apps/web/public/playstore/feature-graphic.png` - 1024 x 500

## Texto base para Play Store

Nombre:

```text
UrbanFix
```

Descripcion corta:

```text
Solicitudes, presupuestos y tecnicos disponibles en un solo lugar.
```

Descripcion completa:

```text
UrbanFix conecta clientes, tecnicos y empresas para ordenar solicitudes de trabajo, presupuestos y seguimiento operativo desde una sola plataforma.

Los clientes pueden publicar una necesidad, indicar zona y horario, y recibir respuestas de tecnicos disponibles.

Los tecnicos pueden administrar su perfil, revisar solicitudes, preparar presupuestos, compartirlos y ordenar sus trabajos.

UrbanFix tambien incluye vidriera publica de tecnicos, comunidad, soporte y herramientas para mejorar la gestion diaria del trabajo tecnico.
```

## Datos de seguridad y privacidad a declarar

La app usa cuentas de usuario y puede tratar:

- nombre o identificador de perfil;
- email;
- telefono o WhatsApp;
- ubicacion aproximada o zona de trabajo;
- imagen de perfil o imagenes cargadas por el usuario;
- contenido de solicitudes, presupuestos y mensajes de soporte.

Declarar solo lo que efectivamente se use en produccion. Mantener consistente con la politica de privacidad publicada.

## Fuente oficial Google Play

Google Play indica que las apps se gestionan con Android App Bundles, que el `versionCode` debe incrementarse en cada update y que la ficha requiere datos de app, contacto y assets publicos:

https://support.google.com/googleplay/android-developer/answer/9859152
