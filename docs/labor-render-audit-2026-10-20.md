# Renders de mano de obra

Corte de solo lectura del catalogo maestro del 20/10/2026: 410 registros de tipo
`labor`. No se consultaron ni modificaron importes, unidades de cobro, coeficientes,
presupuestos, permisos o publicaciones.

## Cobertura

- 410/410 registros con miniatura local y acceso a su escena 3D integrada.
- 125 familias utilizadas; 126 escenas empaquetadas, incluyendo el cerco libre.
- 344 ejecuciones/montajes, 15 reparaciones/reemplazos, 7 demoliciones/retiros,
  10 mantenimientos, 6 inspecciones/ensayos, 16 servicios documentales y
  12 valores por tiempo/servicio.

Las escenas de montaje muestran contexto de aplicacion: muros, pisos, soportes,
canalizaciones o conexiones de referencia. Los retiros y reparaciones muestran
piezas separadas, sectores incompletos o herramientas de intervencion, no un
resultado nuevo terminado. Los servicios documentales y por tiempo tienen una
ilustracion propia; no se simulan certificados emitidos ni horas ejecutadas.

Son ejemplos de familia, no reproducciones exactas de cada tarifa. No determinan
cantidades, dimensiones comerciales, configuracion, suministros incluidos ni
cumplimiento normativo. El nombre y el valor original del trabajo siguen visibles.

## Arquitectura

El constructor `embedded-design/workScenes.js` se usa tanto para generar las
miniaturas WebP como en el visor interactivo. Reutiliza modelos y calculadores
canonicos sin cambiar sus consumos. La lista no crea un contexto WebGL por fila.
Solo el detalle abierto carga un modelo; al salir se liberan sus recursos.

La mano de obra no consulta `render_library` de materiales, no hereda ofertas de
productos ni altera precios. El visor de trabajo es de solo lectura y no ejecuta
guardado de proyectos o presupuestos. Conserva el aislamiento y las restricciones
de navegacion del WebView/iframe existente.

## Reproducir

Desde `apps/mobile`, con las rutas de Playwright configuradas:

```sh
npm run build:work-renders
npm run build:design
npm run test:catalog-renders
```

Desde la raiz movil, `node scripts/audit-labor-renders.mjs` regenera el informe
JSON por registro usando el snapshot sanitizado, sin llamadas a produccion.
La generacion verifica geometria finita, centrado, pixeles no vacios, encuadre
y liberacion de geometria, materiales y texturas. El manifiesto conserva hashes
de imagenes y del constructor compartido.

## Verificaciones

- Generacion de las 126 escenas: geometria, encuadre, pixeles y recursos liberados.
- 7 pruebas de catalogo, 4 del contrato del visor y 17 de proyectos aprobadas.
- TypeScript sin errores; lint y build de la fuente web canonica aprobados.
- Recorrido del catalogo y ocho escenas interactivas aprobado en 320, 390 y
  1440 px: miniaturas decodificadas, canvas no vacio, giro, regreso al catalogo,
  precios de prueba conservados y sin consultas a imagenes de materiales.
- Regresion del catalogo mixto aprobada en 390 px: prioridad de imagenes
  publicadas, URL vencida, fallback local, 16 materiales agregados y visor 3D.
- Exportaciones locales Android e iOS aprobadas, con 708 recursos empaquetados.

Los recorridos se ejecutaron en serie, sin exportaciones simultaneas, despues de
un bloqueo del navegador de pruebas bajo carga. La prueba de giro espera
estabilidad de navegacion y cambios de pixeles, no un retardo fijo de un frame.

Las exportaciones no son una publicacion ni una prueba en dispositivos fisicos.
No se realizo push, build de tienda, envio a revision ni actualizacion OTA.
