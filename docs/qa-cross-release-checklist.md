# QA Cross-Device Checklist

Este protocolo define la ronda de QA cruzada entre `PC1`, `PC2` y `Owner`
antes de cada release relevante.

## Objetivo

- Detectar regresiones funcionales antes de merge/deploy.
- Dejar evidencia trazable en `admin > Roadmap`.
- Unificar criterio de aprobacion entre web y mobile.

## Cadencia sugerida

1. Al cerrar features del sprint (`release-candidate`).
2. Antes de deploy web a produccion.
3. Antes de subir build iOS/Android (TestFlight/Play Internal).

## Reglas de ejecucion

1. Cada rol prueba en su dispositivo principal.
2. Todo hallazgo se reporta en la tarjeta de roadmap con prefijo:
- `[PC1]`
- `[PC2]`
- `[Owner]`
3. Si un hallazgo rompe flujo principal, la tarjeta pasa a `blocked`.
4. El release solo pasa a `done` con 3 validaciones:
- smoke web OK,
- smoke mobile OK,
- owner funcional OK.

## Matriz minima por rol

### PC1 (integracion)

1. Web login + acceso `/tecnicos` y `/admin`.
2. Roadmap en admin (listar, cambiar estado, agregar feedback).
3. Build/deploy web sin errores de runtime.

### PC2 (feature)

1. Mobile login + navegacion tabs.
2. Flujo de presupuesto basico:
- crear,
- guardar,
- abrir detalle.
3. Perfil:
- editar datos,
- guardar base operativa,
- validar version visible `X.Y.Z (build)`.

### Owner (producto/QA)

1. Revision funcional de UX/copy.
2. Confirmar que los fixes solicitados estan presentes.
3. Aprobar o bloquear release con causa concreta.

## Plantilla de reporte en roadmap

```text
[PC2] QA cross in_progress
Que cambie: ejecuto smoke mobile + perfil + version.
Que falta: validacion owner.
Riesgo/bloqueo: ninguno.
```

```text
[PC2] QA cross done
Que cambie: smoke mobile OK (login, tabs, presupuesto, perfil).
Que falta: merge/release.
Riesgo/bloqueo: sin bloqueos.
```

## Criterio de cierre de la tarjeta "QA cruzado"

- Existe feedback de `PC1`, `PC2` y `Owner`.
- No hay bloqueos abiertos en tarjetas high priority del release.
- La tarjeta queda en `done` con fecha y resumen final.
