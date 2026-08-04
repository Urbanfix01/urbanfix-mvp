import type { BudgetAiAnswer, BudgetAiQuestion, BudgetAssistantTrade } from './budget-assistant-types';

export const TRADES: BudgetAssistantTrade[];
export const TRADE_LABELS: Record<BudgetAssistantTrade, string>;
export const TEMPLATE_OPTIONS: Record<BudgetAssistantTrade, Array<{ key: string; label: string }>>;
export function normalizeText(value: unknown): string;
export function positiveNumber(value: unknown): number | null;
export function detectTrade(description: string): {
  trade: BudgetAssistantTrade | null;
  ambiguous: boolean;
  scores: Array<{ trade: BudgetAssistantTrade; score: number }>;
};
export function catalogBelongsToTrade(item: Record<string, unknown>, trade: BudgetAssistantTrade): boolean;
export function resolveCatalogUnit(item: Record<string, unknown>): string;
export function dedupeCatalog<T extends Record<string, unknown>>(rows: T[], trade: BudgetAssistantTrade): T[];
export function buildGuidedSelection(input: {
  trade: BudgetAssistantTrade;
  description?: string;
  answers?: Record<string, BudgetAiAnswer>;
  templateKey?: string | null;
  catalog?: Array<Record<string, any>>;
}): {
  title: string;
  summary: string;
  assumptions: string[];
  questions: BudgetAiQuestion[];
  unmatchedItems: Array<{ description: string; quantity: number | null; unit: string | null; reason: string }>;
  exclusions: string[];
  safetyNotes: string[];
  items: Array<{
    catalogItemId: string | null;
    quantity: number | null;
    purpose: string;
    optional: boolean;
    confidence: 'high' | 'medium' | 'low';
    manualUnitPrice?: number;
    manualName?: string;
  }>;
};
export function stableRevision(input: unknown): string;
export function replaceProposalItems<T extends { assistantProposalId?: string }>(currentItems: T[], nextItems: T[], proposalId: string): T[];
export function collectAssistantPendingConcepts(items: Array<{ assistantPending?: string[] }>): string[];
