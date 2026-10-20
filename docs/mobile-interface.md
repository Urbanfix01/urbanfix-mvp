# Interfaz compartida de UrbanFix Mobile

La actualizacion conserva la identidad de la app original: encabezado oscuro,
superficies claras, acento naranja y seleccion violeta. No cambia la home web,
tarifas, unidades, requisitos del perfil ni documentos de proyectos.

## Base visual

- `apps/mobile/src/utils/theme.ts`: colores semanticos, fuentes, espaciado y
  estilos comunes de formularios. Texto normal y acciones principales con
  contraste minimo 4.5:1 en las combinaciones compartidas.
- `ScreenHeader`: encabezado unico alineado a la izquierda, titulo de 22 px,
  retorno y acciones de al menos 44 px. Maneja el area segura superior; las
  pantallas no agregan otra cabecera nativa encima.
- Campos de 16 px y al menos 48 px de alto, controles con radio de 12 px y
  margen general de 16 px. Botones principales naranja con texto oscuro.
- Proyectos y formularios reutilizan estos estilos. Dashboard, agenda,
  notificaciones, perfiles y selectores reutilizan el encabezado compartido.
- Cliente y profesional comparten la misma base; errores, avisos y estados
  mantienen su significado y sus colores diferenciados.

Los mapas, planos, calendarios y renders conservan sus distribuciones propias.
No se fuerza un formulario o una tarjeta sobre superficies de dibujo.
El login mantiene su composicion de acceso, usando los colores y fuentes comunes.

## Editor integrado

El generador local incorpora los mismos tokens y las tres fuentes de la app en
el HTML del editor. No solicita fuentes a terceros. La politica CSP permite solo
fuentes `data:` y conserva el bloqueo de conexiones y scripts remotos.
El manifiesto verifica tambien los hashes del tema y de las fuentes locales.

Reconstruir con `npm run build:design` despues de modificar el tema, el CSS del
editor o sus dependencias de fuentes. El cambio de formato no modifica el motor
de computos ni los modelos geometricos.

## Verificacion

Desde `apps/mobile`:

```sh
node --test tests/interfaceTheme.test.mjs
node tests/interfaceConsistency.browser.mjs
```

El recorrido de navegador requiere las variables `PLAYWRIGHT_MODULE` y
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`; admite `UI_TEST_WIDTHS` y
`UI_TEST_AUDIENCE=cliente`. Usa una sesion aislada y respuestas simuladas, sin
consultar ni escribir datos comerciales reales. Las capturas quedan en
`apps/mobile/dist/interface-check/`, fuera del control de versiones.

La exportacion Android/iOS no reemplaza la prueba en dispositivos fisicos ni
publica una actualizacion. Esta tarea no incluye push, OTA ni envio a tiendas.

El 20/10/2026 se verificaron las vistas principales del profesional en 320, 390
y 1440 px, y las vistas del cliente en 320 y 390 px. El recorrido ampliado del
profesional incluyo soporte e historial en 390 px. Las pruebas de tema,
TypeScript, regresion del editor y exportacion Android/iOS finalizaron sin
errores. La validacion en dispositivos fisicos sigue pendiente.
