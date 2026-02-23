# Scope Freeze + Criterios de Salida

- Ticket roadmap: `739a4d4d-e482-4930-8a11-f62379ce863c`
- Fecha de cierre operativo: `2026-02-23`
- Responsable de control: `Owner + PC1`

## 1) Scope Freeze (alcance congelado)

Desde esta fecha, solo se aceptan cambios que cumplan al menos una condicion:

1. Corrigen un bug bloqueante de flujo critico (P0).
2. Corrigen un bug severo sin workaround aceptable (P1).
3. Son ajustes de release/operacion (deploy, monitoreo, checklist, trazabilidad).

No entran en esta ventana:

1. Nuevas funcionalidades de producto.
2. Cambios visuales no criticos.
3. Refactors no vinculados a estabilidad de release.

## 2) Definicion de severidad

### P0 (bloqueante)

Impacto: impide publicar o usar flujos core.

Criterios:

1. Login/acceso no funcional.
2. Presupuestar/guardar/compartir no funcional.
3. Caida repetible en flujo principal.
4. Error de datos que compromete integridad operativa.

Politica: se atiende inmediato y puede romper freeze.

### P1 (alto)

Impacto: flujo funciona pero con friccion fuerte o riesgo alto.

Criterios:

1. Degradacion importante en UX o rendimiento en flujo principal.
2. Error funcional con workaround parcial.
3. Fallas de consistencia sin perdida critica de datos.

Politica: se atiende en ventana de release antes de cierre final.

## 3) Criterios de salida de release

Para declarar release listo para publico, todo debe estar en verde:

1. Build y chequeos tecnicos
- Web build OK.
- Mobile TypeScript sin errores.
- Sin errores bloqueantes en logs de release.

2. Flujos criticos
- Login (email + OAuth) OK.
- Crear/editar presupuesto OK.
- Compartir presupuesto/public link OK.
- Estado de trabajo principal y tablero operativo OK.

3. QA de salida
- QA cross-device/cross-browser ejecutado.
- Sin P0 abiertos.
- P1 abiertos solo con aceptacion explicita de Owner.

4. Operacion y trazabilidad
- Checklist pre-push aplicado.
- Release candidate validado.
- Plan de monitoreo 24h definido con responsables.

## 4) Checklist de verificacion (Go/No-Go)

| Item | Estado | Evidencia | Responsable |
| --- | --- | --- | --- |
| Scope freeze comunicado al equipo | OK | Este documento + roadmap | Owner |
| Definicion P0/P1 acordada | OK | Seccion 2 | Owner + PC1 |
| Criterios de salida acordados | OK | Seccion 3 | Owner + PC1 |
| Lista de pendientes alineada a freeze | PENDIENTE | Roadmap operativo | Owner + PC1 + PC2 |
| Decision Go/No-Go documentada | PENDIENTE | Nota final de release | Owner |

## 5) Regla de ejecucion diaria

1. Revisar primero P0/P1.
2. Si una tarea no impacta criterio de salida, no entra.
3. Toda excepcion al freeze debe quedar en roadmap con feedback.
