import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowLeft, Box, DoorOpen, Hand, MousePointer2, PencilRuler, RectangleHorizontal, Ruler, Save, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Scan, RefreshCw, PanelsTopLeft, SlidersHorizontal } from 'lucide-react';
import Canvas from '@/components/urbanfix/HouseDrawingCanvas.jsx';
import Viewer from '@/components/urbanfix/SubfloorViewer3D.jsx';
import MaterialViewer from '@/components/urbanfix/MaterialViewer3D.jsx';
import { DrawingConstructionLibrary, DrawingElementInspector, DrawingWallConstruction, DrawingConstructionField as Field } from '@/components/urbanfix/HouseDrawingConstructionPanel.jsx';
import DrawingOpeningInspector, { DrawingOpeningLibrary } from '@/components/urbanfix/HouseDrawingOpenings.jsx';
import LaborReferenceSelect from '@/components/urbanfix/LaborReferenceSelect.jsx';
import { addDrawingElement, calculateHouseDrawing, normalizeHouseDrawing, updateDrawingWall, DRAWING_LIMITS } from '@/lib/houseDrawing.js';
import { buildHouseDrawingModel } from '@/lib/houseDrawingModel.js';
import { createDrawingQuote } from '@/lib/houseDrawingConstruction.js';
import { updateDrawingEntryRate, drawingProjectCosts } from '@/lib/houseDrawingProject.js';
import { drawingLaborQuoteLines } from '@/lib/drawingLaborQuotation.js';
import { consolidateProjectMaterials } from '@/lib/projectMaterialSummary.js';
import { MATERIALS_CATALOG } from '@/lib/materialsCatalog.js';
import { getMaterialVisual } from '@/lib/materialVisuals.js';
import { projectDocument } from '@/lib/projectHistory.js';
import useDrawingProjectQuotation from '@/hooks/useDrawingProjectQuotation.js';
import { memory, request, send, start } from './bridge.js';
import { WORK_SCENE_IDS, buildWorkScene } from './workScenes.js';

const measure = (value) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(value);
function Button({ icon: Icon, label, action, active, disabled }) {
  return <button type="button" aria-label={label} title={label} aria-pressed={active} disabled={disabled} onClick={action}><Icon size={18} /></button>;
}
function TextField({ label, value, change, maxLength = 100 }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <label className="field">{label}<input aria-label={label} value={draft} maxLength={maxLength} onChange={(e) => setDraft(e.target.value)}
    onBlur={() => { if (draft !== value) change(draft.trim()); }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label>;
}
function Materials({ initialQuery = '', materialId = '' }) {
  const [search, setSearch] = useState(initialQuery), [item, setItem] = useState(() => MATERIALS_CATALOG.find((entry) => entry.id === materialId) || null), [renders, setRenders] = useState([]), [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState('');
  const generation = useRef(0);
  const load = async (selected) => {
    const current = ++generation.current; setRenders([]); setLoading(true); setFailed('');
    try { const rows = await request('renders', { materialId: selected.id }); if (generation.current === current) setRenders(rows); }
    catch (error) { if (generation.current === current) setFailed(error.message); }
    finally { if (generation.current === current) setLoading(false); }
  };
  useEffect(() => { return () => { generation.current++; }; }, []);
  useEffect(() => { if (item && materialId) void load(item); }, [materialId]);
  if (item) {
    const visual = getMaterialVisual(item);
    return <div className="panel"><div className="actions"><button className="outline" onClick={() => { generation.current++; setItem(null); }}><ArrowLeft size={16} /> Catálogo</button><button className="outline" onClick={() => load(item)}><RefreshCw size={16} /> Actualizar renders</button></div><h2>{item.name}</h2><p className="muted">{item.presentation || item.unit}</p>
      {loading && <p role="status">Consultando renders publicados...</p>}{failed && <p role="alert" className="pending">{failed}</p>}
      {renders.map((row) => <figure className="gallery line" key={row.id}><img src={row.url} alt={row.title} onError={() => setFailed('La imagen venció o no pudo cargarse. Actualizá los renders.')} /><figcaption className="muted">{row.title}</figcaption></figure>)}
      {visual ? <MaterialViewer key={item.id} visual={visual} name={item.name} /> : !loading && !renders.length ? <p className="muted">Sin render publicado para este material.</p> : null}
    </div>;
  }
  const rows = MATERIALS_CATALOG.filter((entry) => `${entry.name} ${entry.rubroName || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="panel"><h2>Materiales y renders</h2><label className="field">Buscar material<input aria-label="Buscar material" value={search} onChange={(e) => setSearch(e.target.value)} /></label><p className="muted">{rows.length} materiales</p><div className="tiles">{rows.slice(0, 100).map((entry) => <button className="material" key={entry.id} onClick={() => { setItem(entry); void load(entry); }}><Box /><span>{entry.name}<small className="muted block">{entry.presentation || entry.unit}</small></span></button>)}</div>{rows.length > 100 && <p className="muted">Afiná la búsqueda para ver los demás materiales.</p>}</div>;
}
const buildWork = (result) => buildWorkScene(result.workId);
function WorkRender({ init }) {
  const result = useMemo(() => ({ workId: init.workId, system: { shortName: 'trabajo', viewerName: 'Trabajo' }, config: { excludedArea: 0 } }), [init.workId]);
  if (!WORK_SCENE_IDS.includes(init.workId)) return <div role="alert" className="panel">No hay una escena definida para este trabajo.</div>;
  return <div className="app mobile-original"><main className="surface"><div className="panel" data-work-scene={init.workId}>
    <h2>{init.workName || 'Mano de obra'}</h2>
    <Viewer result={result} modelBuilder={buildWork} hideBaseToggle hideLayerToggle dimensionLabel="Vista orientativa del trabajo" layerLabel="Escena de referencia, sin cantidades computadas" viewKey={init.workId} onDownload={() => {}} />
    <p className="muted">Representacion de la familia de trabajo. No define cantidades, dimensiones, materiales incluidos ni alcance exacto de la tarifa; no es un detalle aprobado para obra.</p>
    {['documentation', 'inspection', 'service-time'].includes(init.workId) && <p className="muted">Ilustracion del servicio. No acredita horas realizadas, ensayos ni certificados emitidos.</p>}
  </div></main></div>;
}
function Editor({ init }) {
  const [past, setPast] = useState([]), [future, setFuture] = useState([]);
  const [project, setProject] = useState(() => init.document ? normalizeHouseDrawing(init.document.draft) : null);
  const [tab, setTab] = useState(init.mode === 'materials' ? 'catalogo' : 'plano'), [tool, setTool] = useState('select'), [selected, setSelected] = useState(null);
  const [elementType, setElementType] = useState('cerco'), [error, setError] = useState(''), [status, setStatus] = useState(''), [cutaway, setCutaway] = useState(false);
  const [openingVariants, setOpeningVariants] = useState({ door: 'door-hinged', window: 'window-sliding' });
  const [revision, setRevision] = useState(0), [saving, setSaving] = useState(false), [quoteBusy, setQuoteBusy] = useState(false), [quoteId, setQuoteId] = useState(null);
  const [allowEstimates, setAllowEstimates] = useState(false), [includeMaterials, setIncludeMaterials] = useState(true);
  const canvasRef = useRef(null), latest = useRef(null), lastSaved = useRef(''), pendingSave = useRef(null), alive = useRef(true);
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [tab]);
  const scopeKey = `urbanfix:house-drawing:${init.owner}:${init.countryCode}`;
  const changed = (value) => { try { const next = normalizeHouseDrawing(value); setPast((rows) => [...rows.slice(-39), project]); setFuture([]); setProject(next); setError(''); } catch (e) { setError(e.message); } };
  useEffect(() => { const update = () => setRevision((v) => v + 1); window.addEventListener('workspace-storage', update); return () => window.removeEventListener('workspace-storage', update); }, []);
  useEffect(() => () => { alive.current = false; }, []);
  const document = project ? projectDocument(localStorage, scopeKey, project) : null;
  const serialized = JSON.stringify(document); latest.current = document;
  const save = async () => {
    if (!latest.current) return;
    if (pendingSave.current) { await pendingSave.current; return save(); }
    const snapshot = latest.current, raw = JSON.stringify(snapshot);
    if (lastSaved.current === raw) return;
    setSaving(true); setError('');
    const promise = request('save', { document: snapshot }); pendingSave.current = promise;
    try { await promise; lastSaved.current = raw; if (alive.current) { send({ type: 'dirty', value: JSON.stringify(latest.current) !== raw }); } }
    catch (e) { if (alive.current) setError(e.message); throw e; }
    finally { pendingSave.current = null; if (alive.current) setSaving(false); }
  };
  useEffect(() => {
    if (!project) return;
    const dirty = serialized !== lastSaved.current; send({ type: 'dirty', value: dirty });
    if (!dirty) return;
    const timer = setTimeout(() => { void save().catch(() => {}); }, 1200);
    return () => clearTimeout(timer);
  }, [serialized]);
  const result = useMemo(() => project ? calculateHouseDrawing(project) : null, [project]);
  const model = useMemo(() => result ? { ...result, cutaway } : null, [result, cutaway]);
  const commands = [['select', 'Seleccionar y mover', MousePointer2], ['pan', 'Desplazar', Hand], ['wall', 'Dibujar muro', PencilRuler], ['rectangle', 'Dibujar rectángulo', RectangleHorizontal], ['door', 'Colocar puerta', DoorOpen], ['window', 'Colocar ventana', PanelsTopLeft], ['measure', 'Medir', Ruler]];
  const wall = project?.walls.find((w) => w.id === (selected?.wallId || selected?.id)), opening = wall?.openings.find((o) => o.id === selected?.id);
  const element = project?.elements.find((e) => selected?.kind === 'element' && e.id === selected.id);
  const removable = ['wall', 'element', 'opening', 'furniture'].includes(selected?.kind);
  const removeSelection = () => {
    if (!removable) return;
    changed({ ...project,
      walls: project.walls.filter((w) => selected.kind !== 'wall' || w.id !== selected.id).map((w) =>
        selected.kind === 'opening' && w.id === selected.wallId ? { ...w, openings: w.openings.filter((o) => o.id !== selected.id) } : w),
      elements: project.elements.filter((e) => selected.kind !== 'element' || e.id !== selected.id),
      furniture: project.furniture.filter((item) => selected.kind !== 'furniture' || item.id !== selected.id),
    });
    setSelected(null);
  };
  const field = (label, value, change, min = .01, max = 100) => <Field key={label} field={{ key: label, label, min, max, step: .01 }} value={value} error={setError} change={change} />;
  return <div className="app mobile-original"><nav className="tabs" aria-label="Secciones del editor integrado">{(project ? [['plano', 'Plano'], ['3d', '3D'], ['piezas', 'Piezas'], ['valores', 'Cotizar'], ['materiales', 'Cómputo'], ['catalogo', 'Renders']] : [['catalogo', 'Materiales y renders']]).map(([key, label]) => <button role="tab" aria-selected={tab === key} key={key} onClick={() => { setTab(key); setError(''); }}>{label}</button>)}</nav>
    {error && <div role="alert" className="error">{error}</div>}{status && <div role="status" className="status">{status}</div>}
    {project && <div className="tools"><Button icon={Save} label="Guardar versión" disabled={saving} action={() => void save().catch(() => {})} /><Button icon={Undo2} label="Deshacer" disabled={!past.length} action={() => { setFuture([project, ...future]); setProject(past.at(-1)); setPast(past.slice(0, -1)); }} /><Button icon={Redo2} label="Rehacer" disabled={!future.length} action={() => { setPast([...past, project]); setProject(future[0]); setFuture(future.slice(1)); }} /><Button icon={SlidersHorizontal} label="Propiedades de la selección" disabled={!selected} action={() => setTab('piezas')} />{tab === 'plano' && <>{commands.map(([id, label, Icon]) => <Button key={id} icon={Icon} label={label} active={tool === id} action={() => { setTool(id); setSelected(null); }} />)}<Button icon={ZoomIn} label="Acercar plano" action={() => canvasRef.current?.zoom(1.2)} /><Button icon={ZoomOut} label="Alejar plano" action={() => canvasRef.current?.zoom(1 / 1.2)} /><Button icon={Scan} label="Encuadrar plano" action={() => canvasRef.current?.fit()} /></>}</div>}
    <main ref={scrollRef} className="surface">
      {tab === 'catalogo' ? <Materials initialQuery={init.query} materialId={init.materialId} /> : tab === 'plano' ? <div className="plan"><Canvas ref={canvasRef} fillAvailable project={project} result={result} tool={tool} selected={selected} select={setSelected} commit={changed} error={setError} grid fitKey={0} placeElement={(p) => changed(addDrawingElement(project, elementType, p))} openingVariants={openingVariants} /></div>
        : tab === '3d' ? <div className="viewer"><label className="field px-3"><input type="checkbox" checked={cutaway} onChange={(e) => setCutaway(e.target.checked)} /> Muros recortados</label><Viewer result={model} modelBuilder={buildHouseDrawingModel} hideBaseToggle onDownload={() => {}} viewKey={JSON.stringify(project)} layerLabel="Planta baja · elementos incluidos" dimensionLabel={`${measure(result.totalLength)} m de muros · ${measure(result.netArea)} m² interiores`} /></div>
          : tab === 'piezas' ? <div className="panel"><h2>Piezas y medidas</h2><DrawingConstructionLibrary project={project} commit={changed} error={setError} elementType={elementType} setElementType={setElementType} changeTool={(value) => { setTool(value); setTab('plano'); }} place={(p) => changed(addDrawingElement(project, elementType, p))} />
            <DrawingOpeningLibrary variants={openingVariants} setVariant={(type, value) => setOpeningVariants((previous) => ({ ...previous, [type]: value }))} changeTool={(value) => { setTool(value); setTab('plano'); }} />
            {field('Frente del terreno (m)', project.settings.lotWidth, (n) => changed({ ...project, settings: { ...project.settings, lotWidth: n } }), 1)}{field('Fondo del terreno (m)', project.settings.lotDepth, (n) => changed({ ...project, settings: { ...project.settings, lotDepth: n } }), 1)}
            {element && <DrawingElementInspector element={element} project={project} commit={changed} select={setSelected} error={setError} />}
            {opening ? <DrawingOpeningInspector project={project} wall={wall} opening={opening} commit={changed} error={setError} /> : wall && <div className="line"><h3>Muro seleccionado</h3>{field('Altura del muro (m)', wall.height, (height) => changed(updateDrawingWall(project, wall.id, { height })), .5, 6)}<DrawingWallConstruction wall={wall} project={project} commit={changed} error={setError} /></div>}
            {removable && <button className="outline" onClick={removeSelection}><Trash2 size={16} /> Quitar pieza seleccionada</button>}
            {[...project.walls.flatMap((w, i) => [{ id: w.id, name: `Muro ${i + 1}`, kind: 'wall' }, ...w.openings.map((o, j) => ({ id: o.id, wallId: w.id, name: `${o.type === 'door' ? 'Puerta' : 'Ventana'} ${j + 1} · muro ${i + 1}`, kind: 'opening' }))]), ...project.elements.map((e) => ({ ...e, kind: 'element' })), ...project.furniture.map((item) => ({ ...item, kind: 'furniture' }))].map((row) => <button className="material" key={row.id} onClick={() => setSelected({ kind: row.kind, id: row.id, wallId: row.wallId })}>{row.name}</button>)}
          </div> : <Quotation key={project.id} {...{ project, result, changed, init, scopeKey, tab, save, saving, setError, status, setStatus, allowEstimates, setAllowEstimates, includeMaterials, setIncludeMaterials, quoteBusy, setQuoteBusy, quoteId, setQuoteId }} />}
    </main>{project && <footer className="notice">Anteproyecto · metros · {saving ? 'Guardando versión...' : 'Historial por versión'}. No apto para obra ni aprobación técnica.</footer>}
  </div>;
}
function Quotation({ project, result, changed, init, scopeKey, tab, save, saving, setError, setStatus, allowEstimates, setAllowEstimates, includeMaterials, setIncludeMaterials, quoteBusy, setQuoteBusy, quoteId, setQuoteId }) {
  const { catalog, references, calculation, quotation } = useDrawingProjectQuotation({ project, result, userId: init.owner, countryCode: init.countryCode, scopeKey });
  const currency = init.countryCode === 'UY' ? 'UYU' : 'ARS', money = (value) => value === null ? 'Pendiente' : new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(value);
  const costs = drawingProjectCosts(calculation, quotation.rows, includeMaterials), groups = consolidateProjectMaterials(quotation.rows);
  const busy = calculation.loading || references.loading || quotation.loading;
  const updateInfo = (patch) => {
    const { clientReference, ...previous } = project.projectInfo || {};
    changed({ ...project, projectInfo: { version: 1, kind: 'design-project', countryCode: init.countryCode,
      clientName: '', location: '', createdAt: init.createdAt || new Date().toISOString(), ...previous,
      ...(patch.clientName === undefined && clientReference ? { clientReference } : {}), ...patch } });
  };
  const price = (label, value, change) => <Field field={{ key: label, label, min: .01, max: 1e10, step: .01, optional: true }} value={value ?? ''} error={setError} change={change} />;
  const quote = async () => {
    setQuoteBusy(true); setError('');
    try {
      if (costs.missingLabor || includeMaterials && costs.missingMaterials) throw new Error('Completá los valores pendientes antes de guardar un presupuesto. No se convierten en cero.');
      const payload = references.decorate(drawingLaborQuoteLines(createDrawingQuote(project, calculation, quotation.rows, { currency, includeMaterials }),
        calculation.labor.map((row, i) => references.rows[i]?.active ? { ...row, selected: null } : row)));
      await save(); const response = await request('quote', { payload, quoteId }); setQuoteId(response.id); setStatus(`Borrador ${response.number} guardado en tu cuenta. No se envió al cliente.`);
    } catch (e) { setError(e.message); } finally { setQuoteBusy(false); }
  };
  return <div className="panel"><div className="actions"><button className="outline" disabled={busy} onClick={() => { void catalog.retry(); void quotation.retry(); void references.retry(); }}>Actualizar valores</button><button className="outline" disabled={busy} onClick={() => { references.fillPending(calculation.labor.filter((r) => r.total === null).map((r) => r.id), allowEstimates); catalog.fill(allowEstimates); quotation.fillPending(); }}>Completar referencias disponibles</button></div><label className="field"><input type="checkbox" checked={allowEstimates} onChange={(e) => setAllowEstimates(e.target.checked)} /> Permitir estimaciones orientativas</label>
    {busy && <p role="status" className="muted">Consultando valores de tu cuenta...</p>}{[calculation.error, quotation.error, references.error].filter(Boolean).map((message) => <p role="alert" className="pending" key={message}>{message}</p>)}
    <div className="totals">{[['Mano de obra', costs.laborTotal], ['Materiales', costs.materialsTotal], ['Subtotal conocido', costs.knownTotal]].map(([name, total]) => <div key={name}><span className="muted">{name}</span><strong>{money(total)}</strong></div>)}</div><p className="muted pending">{costs.missingLabor} tarifa(s) y {costs.missingMaterials} material(es) pendientes.</p>
    {tab === 'materiales' ? <><h2>Total de materiales del proyecto</h2>{groups.map((row) => <article className="line" key={row.id}><h3>{row.name}</h3><p className="muted">{row.presentation}</p><strong>{row.purchaseQuantity === null ? 'Cantidad pendiente' : `${measure(row.purchaseQuantity)} ${row.unit}`}</strong><p>{money(row.total)}</p><details><summary>Destino y uso</summary>{row.destinations.map((d, i) => <p className="muted" key={i}>{d.name} · {d.purchaseQuantity === null ? 'Pendiente' : measure(d.purchaseQuantity)} {row.unit}{d.usage ? ` · ${d.usage}` : ''}</p>)}</details></article>)}</>
      : <><h2>Datos del presupuesto</h2><TextField label="Título del proyecto" value={project.name} change={(name) => changed({ ...project, name })} /><TextField label="Cliente del presupuesto" value={project.projectInfo?.clientName || ''} change={(clientName) => updateInfo({ clientName })} /><TextField label="Ubicación de la obra" maxLength={200} value={project.projectInfo?.location || ''} change={(location) => updateInfo({ location })} /><h2>Mano de obra</h2>{calculation.labor.map((row) => <article className="line" key={row.id}><h3>{row.name}</h3><p className="muted">{measure(row.quantity)} {row.unit} · {money(row.total)}</p><label className="field">Origen de tarifa<select aria-label={`Origen de tarifa de ${row.name}`} value={row.reference} onChange={(e) => catalog.select(row, e.target.value)}><option value="manual">Tarifa propia</option>{row.candidates.map((c) => <option key={c.reference} value={c.reference}>{c.estimated ? 'Orientativo · ' : ''}{c.item.name}</option>)}</select></label>{row.reference === 'manual' && price(`Tarifa por ${row.unit}`, row.rate, (value) => changed(updateDrawingEntryRate(project, row.id, value)))}<LaborReferenceSelect controller={references} row={references.rows.find((r) => r.id === row.id)} label={`Referencia de ${row.name}`} /></article>)}
        <h2 className="mt-5">Materiales por destino</h2>{quotation.rows.map((row) => <article className="line" key={row.id}><h3>{row.name}</h3><p className="muted">{row.origin} · {row.purchaseQuantity === null ? 'Cantidad pendiente' : `${measure(row.purchaseQuantity)} ${row.unit}`} · {row.presentation}</p><label className="field">Presentación y precio<select value={row.reference} aria-label={`Precio de ${row.name}`} onChange={(e) => quotation.select(row, e.target.value)}><option value="manual">Precio propio</option>{row.candidates.map((c) => <option key={c.reference} value={c.reference}>{c.item.name} · {money(c.unitPrice)}/{c.unit}</option>)}</select></label>{price(`Precio por ${row.unit}`, row.unitPrice, (value) => changed({ ...project, prices: { ...project.prices, [row.priceKey]: value } }))}<p>{money(row.total)}</p></article>)}</>}
    {!calculation.entries.length && <p className="muted">Sin partidas: asigná un sistema constructivo a los muros o agregá una pieza.</p>}
    <details className="line"><summary>Alcances pendientes</summary>{calculation.pending.map((text, i) => <p className="muted" key={i}>{text}</p>)}<p className="muted">{DRAWING_LIMITS}</p></details>
    <label className="field"><input type="checkbox" checked={includeMaterials} onChange={(e) => setIncludeMaterials(e.target.checked)} /> Incluir materiales en el presupuesto</label>
    <div className="actions"><button className="primary" disabled={busy || quoteBusy || saving || !calculation.entries.length} onClick={() => void quote()}>{quoteBusy ? 'Guardando...' : quoteId ? 'Actualizar borrador del presupuesto' : 'Guardar borrador del presupuesto'}</button></div>
  </div>;
}
start((init) => {
  const scope = `urbanfix:house-drawing:${init.owner}:${init.countryCode}`;
  for (const [suffix, value] of Object.entries(init.document?.auxiliary || {})) memory.set(scope + suffix, value);
  createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}>{init.mode === 'work' ? <WorkRender init={init} /> : <Editor init={init} />}</QueryClientProvider>);
});
