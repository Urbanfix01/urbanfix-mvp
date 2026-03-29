# Demo rapido mobile

Este repo queda preparado para un flujo de demo rapido con estas dos salidas:

- Android: APK abierto por link.
- iPhone: TestFlight con enlace publico.

## Comandos desde la raiz

```bash
npm run mobile:typecheck
npm run mobile:demo:android
npm run mobile:demo:ios
npm run mobile:demo:ios:submit
```

## Android: APK abierto

Usar el perfil `demo-android`.

Que hace:

- genera APK, no AAB;
- usa `distribution: internal` para obtener un link de instalacion compartible;
- evita pedir mails de testers.

Flujo:

1. Ejecutar `npm run mobile:demo:android`.
2. Esperar el build de EAS.
3. Compartir el install URL o descargar el APK desde el build resultante.
4. Si hace falta un link totalmente publico fuera de Expo, subir ese APK a un storage publico y compartir esa URL.

Notas:

- En algunos dispositivos Android el usuario debera permitir instalacion desde origen externa.
- Para demo rapido, este es el camino con menos friccion.

## iPhone: TestFlight publico

Usar el perfil `demo-ios` para build y `demo` para submit.

Flujo:

1. Ejecutar `npm run mobile:demo:ios`.
2. Cuando termine, ejecutar `npm run mobile:demo:ios:submit`.
3. Ir a App Store Connect.
4. Abrir TestFlight para la app `com.urbanfix.urbanfix`.
5. Esperar procesamiento de Apple.
6. Enviar la build a External Testing si aplica.
7. Una vez aprobada para testers externos, habilitar Public Link.
8. Compartir ese enlace publico.

Notas importantes:

- iPhone no admite un flujo equivalente al APK abierto para usuarios finales.
- Si el build aun no fue aprobado para testers externos, Apple no mostrara enlace publico.
- Con enlace publico no hace falta cargar mails uno por uno.

## Perfiles configurados

En `apps/mobile/eas.json` quedaron definidos:

- `build.demo-android`
- `build.demo-ios`
- `submit.demo`

## Criterio de uso

Elegir este flujo cuando el objetivo sea compartir el demo rapido con la menor friccion posible.

Si luego el demo pasa a una distribucion mas estable:

- Android puede migrar a Google Play Open Testing.
- iPhone puede seguir en TestFlight publico o pasar a release normal.