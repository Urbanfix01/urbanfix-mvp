# Materiales: cierre de renders del catalogo maestro

Relevamiento de solo lectura del 20/10/2026, proyecto Supabase `jfqutuptbrgtwbofpawp`.
Se consultaron ID, nombre, referencia, unidad y tipo; no se modificaron precios,
publicaciones, presupuestos, permisos ni datos de clientes.

## Resultado

- 128 registros de materiales e insumos: 124 objetos fisicos y 4 costos generales.
- Antes: 101 registros vinculados; faltaban 23 objetos fisicos.
- Despues: 124/124 objetos fisicos con miniatura local y acceso a su familia 3D.
- 15 nuevas familias parametricas; los precintos reutilizan su modelo ya existente.
- Biblioteca compartida: de 670 a 685 familias, todas con miniatura WebP local.
- Fletes/logistica (2) y gastos varios (2) no llevan un render de producto.

## Piezas completadas

| Familia | Registros del maestro | Criterio visual |
| --- | ---: | --- |
| Bastidor + tapa | 6 | Conjunto sin mecanismos |
| Bastidor rectangular | 3 | Marco abierto, fijaciones visibles |
| Tapa de bastidor | 1 | Tapa abierta sin modulos |
| Caja octogonal | 1 | Carcasa de chapa abierta, marcas de entradas |
| Caja de medidor | 1 | Carcasa con visor; sin medidor ni cableado |
| Conector de PVC electrico | 1 | Pasaje hueco, rosca y contratuerca |
| Kit punto y toma | 1 | Ejemplo de interruptor y toma en bastidor |
| Portalampara ceramico | 1 | Zocalo y contacto, sin lampara |
| Reflector LED | 1 | Frente, LED, soporte y disipador |
| Tortuga LED | 1 | Difusor y proteccion frontal |
| Precintos | 1 | Modelo existente de sujecion plastica |
| Tarugos con tornillos | 1 | Pareja ilustrativa, no bolsa completa |
| Cal viva molida | 1 | Bolsa propia, distinta de cal hidratada |
| Cano galvanizado de acometida | 1 | Tubo metalico hueco, no cano sanitario |
| Chapa prepintada | 1 | Ambos perfiles como ejemplos; el maestro no define uno |
| Vidrio templado | 1 | Familia propia; apariencia no acredita tratamiento |

Son renders ilustrativos de familia: no son fotografias del proveedor ni garantizan
marca, medidas, certificaciones, cantidades del paquete o compatibilidad electrica.
Se conserva la prioridad de imagenes publicadas compatibles y su respaldo local.
No se asignan imagenes de materiales a trabajos de mano de obra.

## Reproducir

Desde la raiz movil: `node scripts/sync-material-previews.mjs` y
`node scripts/audit-material-renders.mjs`. El ultimo usa el snapshot sanitizado,
no vuelve a consultar datos de produccion. Su JSON incluye cada registro y destino.
Una auditoria futura requiere una nueva consulta fechada, no asumir que este corte
permanece actualizado.

Los modelos y miniaturas originales viven en el repositorio web canonico.
`scripts/generate-missing-material-thumbnails.mjs` genera solamente imagenes
ausentes y verifica pixeles no vacios y encuadre. Luego se sincronizan al movil y
se reconstruye `npm run build:design` desde `apps/mobile`.

## Verificacion

- 685 familias: geometrias validas, aberturas reales, encuadre y liberacion de recursos.
- 6 regresiones de catalogo y 3 contratos del editor integrado aprobados.
- Playwright a 320, 390, 768 y 1440 px: miniaturas, filtros, ampliacion, imagenes publicadas,
  respaldo local, navegacion y giro del nuevo modelo 3D, sin abrir una web externa.
- Recuperacion del visor web verificada perdiendo intencionalmente el primer aviso
  de inicio; la confirmacion al cargar el iframe conserva el aislamiento del sandbox.
- Build web, TypeScript y exportacion de recursos Android/iOS aprobados.
- El informe no equivale a una publicacion en Google Play o App Store.
