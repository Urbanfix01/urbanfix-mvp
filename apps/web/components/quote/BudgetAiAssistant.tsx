'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Loader2, Plus, Sparkles } from 'lucide-react';

import type {
  BudgetAiAnalysis,
  BudgetAiAnswer,
  BudgetAiApplyPayload,
  BudgetAiPricedItem,
  BudgetAiQuestion,
  BudgetAssistantTrade,
} from '../../lib/ai/budget-assistant-types';

type BudgetAiAssistantProps = {
  accessToken?: string | null;
  onApply: (payload: BudgetAiApplyPayload) => void;
  onOpenCalculator?: (trade: BudgetAssistantTrade, templateKey: string) => void;
};

const TRADE_OPTIONS: Array<{ value: BudgetAssistantTrade; label: string; hint: string }> = [
  { value: 'electricidad', label: 'Electricidad', hint: 'Bocas, luces, tomas y canalizacion' },
  { value: 'sanitarios', label: 'Sanitarios', hint: 'Griferias, artefactos y canerias' },
  { value: 'pintura', label: 'Pintura', hint: 'Interior, exterior y cielorrasos' },
  { value: 'mamposteria', label: 'Mamposteria', hint: 'Muros de ladrillo y bloques' },
];

const TEMPLATES: Record<BudgetAssistantTrade, Array<{ key: string; label: string }>> = {
  electricidad: [
    { key: 'bocas', label: 'Bocas y cableado' },
    { key: 'iluminacion_fotocelula', label: 'Iluminacion / fotocelula' },
    { key: 'tomas', label: 'Tomacorrientes' },
    { key: 'canalizacion', label: 'Canalizacion' },
    { key: 'tablero_protecciones', label: 'Tablero / protecciones' },
  ],
  sanitarios: [
    { key: 'griferia', label: 'Griferia' },
    { key: 'artefactos', label: 'Artefactos' },
    { key: 'canerias', label: 'Canerias' },
    { key: 'desagues_destapes', label: 'Desagues / destapes' },
    { key: 'bombas_termotanques', label: 'Bombas / termotanques' },
  ],
  pintura: [
    { key: 'interior', label: 'Interior' },
    { key: 'exterior', label: 'Exterior' },
    { key: 'cielorraso', label: 'Cielorraso' },
  ],
  mamposteria: [
    { key: 'ladrillo_hueco_8', label: 'Ladrillo hueco 8' },
    { key: 'ladrillo_hueco_12', label: 'Ladrillo hueco 12' },
    { key: 'ladrillo_hueco_18', label: 'Ladrillo hueco 18' },
    { key: 'ladrillo_comun', label: 'Ladrillo comun' },
    { key: 'bloque_cemento', label: 'Bloque de cemento' },
  ],
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(Number.isFinite(value) ? value : 0);
const createProposalId = () => `proposal-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

const getEngineLabel = (analysis: BudgetAiAnalysis) => {
  if (analysis.engine === 'ai') return 'IA';
  if (analysis.engine === 'template') return 'Plantilla';
  return 'Modo guiado';
};

const questionInputClass = 'mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100';

function QuestionField({
  question,
  value,
  onChange,
  onCommit,
}: {
  question: BudgetAiQuestion;
  value: BudgetAiAnswer | undefined;
  onChange: (value: BudgetAiAnswer) => void;
  onCommit: (value: BudgetAiAnswer) => void;
}) {
  if (question.kind === 'choice') {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {(question.options || []).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              onCommit(option.value);
            }}
            className={`rounded-xl px-3 py-2 text-[11px] font-black transition ${
              value === option.value
                ? 'bg-amber-500 text-slate-950'
                : 'border border-amber-200 bg-white text-amber-800 hover:border-amber-400'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.kind === 'boolean') {
    return (
      <select
        aria-label={question.question}
        value={typeof value === 'boolean' ? String(value) : ''}
        onChange={(event) => {
          const nextValue = event.target.value === 'true';
          onChange(nextValue);
          onCommit(nextValue);
        }}
        className={questionInputClass}
      >
        <option value="">Seleccionar</option>
        <option value="true">Si</option>
        <option value="false">No</option>
      </select>
    );
  }

  return (
    <div className="relative">
      <input
        aria-label={question.question}
        type="number"
        min="0"
        step={question.kind === 'money' ? '1' : '0.1'}
        value={typeof value === 'number' || typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          const parsed = Number(event.target.value.replace(',', '.'));
          if (Number.isFinite(parsed) && parsed > 0) onCommit(parsed);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          const parsed = Number(event.currentTarget.value.replace(',', '.'));
          if (Number.isFinite(parsed) && parsed > 0) onCommit(parsed);
        }}
        className={`${questionInputClass} ${question.unit ? 'pr-16' : ''}`}
        placeholder={question.kind === 'money' ? 'Importe confirmado' : 'Cantidad'}
      />
      {question.unit ? <span className="absolute bottom-2.5 right-3 text-[10px] font-black text-slate-400">{question.unit}</span> : null}
    </div>
  );
}

function ProposalItem({
  item,
  checked,
  onToggle,
}: {
  item: BudgetAiPricedItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const selectable = item.status !== 'pending' && item.total !== null;
  return (
    <label className={`block rounded-2xl border px-3 py-3 ${
      item.status === 'pending'
        ? 'border-amber-200 bg-amber-50/80'
        : checked
          ? 'border-violet-200 bg-white shadow-sm'
          : 'border-slate-200 bg-white/70'
    } ${selectable ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={!selectable}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-slate-950">{item.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
              item.pricingSource === 'manual' ? 'bg-sky-100 text-sky-700' : item.pricingSource === 'catalog' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {item.pricingSource === 'manual' ? 'Precio manual' : item.pricingSource === 'catalog' ? 'Supabase' : 'Sin precio'}
            </span>
          </span>
          <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">{item.purpose}</span>
          <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1">
              {item.quantity ? `${item.quantity} ${item.unit}` : `Cantidad pendiente (${item.unit})`}
            </span>
            {item.unitPrice > 0 ? <span className="rounded-full bg-slate-100 px-2 py-1">{formatCurrency(item.unitPrice)} / {item.unit}</span> : null}
          </span>
        </span>
        <span className="shrink-0 text-right text-sm font-black text-slate-950">
          {item.total === null ? 'Pendiente' : formatCurrency(item.total)}
        </span>
      </div>
    </label>
  );
}

export default function BudgetAiAssistant({ accessToken, onApply, onOpenCalculator }: BudgetAiAssistantProps) {
  const [proposalId, setProposalId] = useState(createProposalId);
  const [trade, setTrade] = useState<BudgetAssistantTrade>('electricidad');
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [answers, setAnswers] = useState<Record<string, BudgetAiAnswer>>({});
  const [analysis, setAnalysis] = useState<BudgetAiAnalysis | null>(null);
  const [questionHistory, setQuestionHistory] = useState<BudgetAiQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedRevision, setAppliedRevision] = useState('');
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const groups = useMemo(() => ({
    confirmed: analysis?.items.filter((item) => item.status === 'confirmed') || [],
    pending: analysis?.items.filter((item) => item.status === 'pending') || [],
    optional: analysis?.items.filter((item) => item.status === 'optional') || [],
  }), [analysis]);
  const selectedItems = useMemo(() => analysis?.items.filter((item) => selectedIdSet.has(item.id) && item.total !== null) || [], [analysis, selectedIdSet]);
  const selectedTotal = useMemo(() => selectedItems.reduce((sum, item) => sum + Number(item.total || 0), 0), [selectedItems]);

  const runAnalysis = async (overrideAnswers?: Record<string, BudgetAiAnswer>) => {
    if (!accessToken) {
      setError('Tu sesion vencio. Volve a ingresar antes de usar el asistente.');
      return;
    }
    if (!templateKey && description.trim().length < 8) {
      setError('Describe el trabajo o selecciona una plantilla.');
      return;
    }
    const nextAnswers = overrideAnswers || answers;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/tecnico/budget-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ proposalId, trade, templateKey, description: description.trim(), answers: nextAnswers }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(payload?.error || 'No pudimos analizar el trabajo.'));
      const nextAnalysis = payload?.analysis as BudgetAiAnalysis | undefined;
      if (!nextAnalysis?.items || !nextAnalysis.proposalId) throw new Error('La respuesta del asistente no tiene un formato valido.');
      setAnalysis(nextAnalysis);
      setQuestionHistory((current) => {
        const byKey = new Map(current.map((question) => [question.key, question]));
        nextAnalysis.questions.forEach((question) => byKey.set(question.key, question));
        return Array.from(byKey.values());
      });
      setSelectedIds(nextAnalysis.items.filter((item) => item.status === 'confirmed' && item.total !== null).map((item) => item.id));
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'No pudimos analizar el trabajo.');
    } finally {
      setLoading(false);
    }
  };

  const commitAnswer = (key: string, value: BudgetAiAnswer) => {
    const nextAnswers = { ...answers, [key]: value };
    setAnswers(nextAnswers);
    void runAnalysis(nextAnswers);
  };

  const resetProposal = (nextTrade = trade) => {
    setProposalId(createProposalId());
    setTrade(nextTrade);
    setTemplateKey(null);
    setDescription('');
    setAnswers({});
    setAnalysis(null);
    setQuestionHistory([]);
    setSelectedIds([]);
    setAppliedRevision('');
    setError('');
  };

  const applyProposal = () => {
    if (!analysis || !selectedItems.length) return;
    onApply({ analysis, items: selectedItems });
    setAppliedRevision(analysis.revision);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-[22px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-orange-50">
      <div className="border-b border-violet-100 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm"><Sparkles className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">Presupuestador asistido</p>
              <h4 className="mt-1 text-sm font-black text-slate-950">Un bloque por rubro, varios bloques por presupuesto</h4>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Los precios exactos salen del catalogo activo; los manuales quedan identificados.</p>
            </div>
          </div>
          {analysis ? (
            <button type="button" onClick={() => resetProposal()} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-violet-200 bg-white px-2.5 py-2 text-[10px] font-black text-violet-700">
              <Plus className="h-3.5 w-3.5" /> Nueva propuesta
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TRADE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => resetProposal(option.value)}
              className={`rounded-2xl border px-3 py-3 text-left transition ${trade === option.value ? 'border-violet-400 bg-violet-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200'}`}
            >
              <span className="block text-xs font-black">{option.label}</span>
              <span className={`mt-1 block text-[9px] font-semibold leading-4 ${trade === option.value ? 'text-white/70' : 'text-slate-400'}`}>{option.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Empezar con una plantilla</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TEMPLATES[trade].map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => {
                  if ((trade === 'pintura' || trade === 'mamposteria') && onOpenCalculator) {
                    onOpenCalculator(trade, template.key);
                    return;
                  }
                  setTemplateKey(templateKey === template.key ? null : template.key);
                }}
                className={`rounded-xl px-3 py-2 text-[10px] font-black transition ${templateKey === template.key ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value.slice(0, 4000))}
          rows={4}
          aria-label="Descripcion tecnica del trabajo"
          placeholder="Describe el sector, las tareas y todas las medidas que ya conoces..."
          className="mt-4 w-full resize-y rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold text-slate-400">No incluyas nombre, telefono ni direccion del cliente.</p>
          <button type="button" onClick={() => void runAnalysis()} disabled={loading || (!templateKey && description.trim().length < 8)} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Recalculando...' : analysis ? 'Actualizar propuesta' : 'Crear propuesta'}
          </button>
        </div>
        {error ? <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}
      </div>

      {analysis ? (
        <div className="space-y-4 px-4 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-700">{getEngineLabel(analysis)}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">{TRADE_OPTIONS.find((item) => item.value === analysis.trade)?.label}</span>
            </div>
            <h5 className="mt-2 text-base font-black text-slate-950">{analysis.title}</h5>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{analysis.summary}</p>
            {analysis.engine === 'guided' ? <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-semibold leading-4 text-amber-700">AI Gateway no esta disponible. La propuesta usa el modo guiado y el mismo catalogo activo.</p> : null}
          </div>

          {questionHistory.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
              <p className="flex items-center gap-2 text-xs font-black text-amber-900"><AlertTriangle className="h-4 w-4" /> {analysis.questions.length ? 'Completar para recalcular' : 'Respuestas confirmadas (editables)'}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {questionHistory.map((item) => (
                  <div key={item.key} className="rounded-xl border border-amber-100 bg-white/60 p-3">
                    <p className="text-[11px] font-black leading-4 text-slate-800">{item.question}</p>
                    <p className="mt-1 text-[9px] font-semibold leading-4 text-slate-500">{item.reason}</p>
                    <QuestionField question={item} value={answers[item.key]} onChange={(value) => setAnswers((current) => ({ ...current, [item.key]: value }))} onCommit={(value) => commitAnswer(item.key, value)} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {(['confirmed', 'pending', 'optional'] as const).map((group) => {
            const rows = groups[group];
            if (!rows.length) return null;
            const labels = { confirmed: 'Confirmado', pending: 'Pendiente', optional: 'Opcional' };
            return (
              <section key={group}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{labels[group]}</p>
                  <span className="text-[10px] font-black text-slate-400">{rows.length}</span>
                </div>
                <div className="space-y-2">
                  {rows.map((item) => <ProposalItem key={item.id} item={item} checked={selectedIdSet.has(item.id)} onToggle={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} />)}
                </div>
              </section>
            );
          })}

          {analysis.exclusions.length ? <details className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"><summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Exclusiones <ChevronDown className="h-4 w-4" /></summary><ul className="mt-2 space-y-1 text-[11px] font-semibold text-slate-600">{analysis.exclusions.map((item) => <li key={item}>- {item}</li>)}</ul></details> : null}

          <div className="flex flex-col gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Total confirmado</p>
              <p className="mt-1 text-2xl font-black">{formatCurrency(selectedTotal)}</p>
              <p className="mt-1 text-[10px] font-semibold text-white/55">{analysis.totals.pendingCount} concepto{analysis.totals.pendingCount === 1 ? '' : 's'} fuera del total</p>
            </div>
            <button type="button" onClick={applyProposal} disabled={!selectedItems.length || appliedRevision === analysis.revision} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff8a18] px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-[#ff9d3d] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
              <Check className="h-4 w-4" />
              {appliedRevision === analysis.revision ? 'Propuesta aplicada' : appliedRevision ? 'Actualizar presupuesto' : 'Agregar al presupuesto'}
            </button>
          </div>
          <p className="text-[10px] font-semibold text-slate-400">Precios de catalogo desde Supabase · {analysis.priceContext.laborIndexLabel}</p>
        </div>
      ) : null}
    </div>
  );
}
