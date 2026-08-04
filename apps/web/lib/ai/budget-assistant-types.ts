export type BudgetAssistantTrade = 'electricidad' | 'sanitarios' | 'pintura' | 'mamposteria';
export type BudgetAssistantEngine = 'ai' | 'guided' | 'template';
export type BudgetAiConfidence = 'high' | 'medium' | 'low';
export type BudgetAiItemStatus = 'confirmed' | 'pending' | 'optional';
export type BudgetAiPricingSource = 'catalog' | 'manual' | 'unpriced';
export type BudgetAiAnswer = string | number | boolean | null;

export type BudgetAiQuestionOption = {
  value: string;
  label: string;
};

export type BudgetAiQuestion = {
  key: string;
  question: string;
  reason: string;
  kind: 'choice' | 'number' | 'money' | 'boolean';
  unit?: string | null;
  required: boolean;
  options?: BudgetAiQuestionOption[];
};

export type BudgetAiPricedItem = {
  id: string;
  catalogItemId: string | null;
  name: string;
  type: 'labor' | 'material' | 'consumable';
  category: string | null;
  sourceRef: string | null;
  unit: string;
  quantity: number | null;
  basePrice: number;
  unitPrice: number;
  total: number | null;
  purpose: string;
  status: BudgetAiItemStatus;
  optional: boolean;
  confidence: BudgetAiConfidence;
  pricingSource: BudgetAiPricingSource;
  technicalNotes: string | null;
};

export type BudgetAiMissingInput = {
  key: string;
  question: string;
  reason: string;
};

export type BudgetAiUnmatchedItem = {
  description: string;
  quantity: number | null;
  unit: string | null;
  reason: string;
};

export type BudgetAiAnalysis = {
  proposalId: string;
  revision: string;
  trade: BudgetAssistantTrade;
  templateKey: string | null;
  engine: BudgetAssistantEngine;
  title: string;
  summary: string;
  assumptions: string[];
  questions: BudgetAiQuestion[];
  missingInputs: BudgetAiMissingInput[];
  unmatchedItems: BudgetAiUnmatchedItem[];
  exclusions: string[];
  safetyNotes: string[];
  items: BudgetAiPricedItem[];
  totals: {
    confirmed: number;
    optional: number;
    pendingCount: number;
    recommended: number;
  };
  priceContext: {
    catalogUpdatedAt: string | null;
    laborIndexLabel: string;
  };
};

export type BudgetAiApplyPayload = {
  analysis: BudgetAiAnalysis;
  items: BudgetAiPricedItem[];
};
