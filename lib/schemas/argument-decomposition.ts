import { z } from 'zod';
import { SentenceReferenceSchema } from './core';

// ============================================
// Claim Schema
// ============================================

export const ClaimTypeSchema = z.enum(['factual', 'causal', 'evaluative', 'policy']);

export type ClaimType = z.infer<typeof ClaimTypeSchema>;

export const ClaimSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(10).max(500),
  sourceSentences: z.array(SentenceReferenceSchema).min(1),
  confidence: z.number().min(0).max(1),
  isVerifiable: z.boolean(),
  claimType: ClaimTypeSchema,
});

export type Claim = z.infer<typeof ClaimSchema>;

// ============================================
// Assumption Schema
// ============================================

export const CriticalitySchema = z.enum(['low', 'medium', 'high', 'critical']);

export type Criticality = z.infer<typeof CriticalitySchema>;

export const AssumptionSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(10).max(500),
  sourceSentences: z.array(SentenceReferenceSchema).min(1),
  confidence: z.number().min(0).max(1),
  isExplicit: z.boolean(),
  criticality: CriticalitySchema,
  // What this assumption underlies
  underlyingClaimIds: z.array(z.string().uuid()).optional(),
});

export type Assumption = z.infer<typeof AssumptionSchema>;

// ============================================
// Prediction Schema
// ============================================

export const PredictionSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(10).max(500),
  sourceSentences: z.array(SentenceReferenceSchema).min(1),
  confidence: z.number().min(0).max(1),
  timeframe: z.string().nullable().optional(), // e.g., "2025", "within 5 years", "immediate"
  conditions: z.string().nullable().optional(), // What conditions must hold for prediction
  isConditional: z.boolean(),
});

export type Prediction = z.infer<typeof PredictionSchema>;

// ============================================
// Value Schema
// ============================================

export const ValueCategorySchema = z.enum([
  'economic',
  'liberty',
  'equality',
  'security',
  'tradition',
  'progress',
  'environment',
  'fairness',
  'efficiency',
  'other',
]);

export type ValueCategory = z.infer<typeof ValueCategorySchema>;

export const ValueSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(10).max(500),
  sourceSentences: z.array(SentenceReferenceSchema).min(1),
  confidence: z.number().min(0).max(1),
  category: ValueCategorySchema,
  isExplicit: z.boolean(),
});

export type Value = z.infer<typeof ValueSchema>;

// ============================================
// Combined Argument Decomposition Result
// ============================================

export const ArgumentDecompositionResultSchema = z.object({
  articleId: z.string().uuid(),
  claims: z.array(ClaimSchema),
  assumptions: z.array(AssumptionSchema),
  predictions: z.array(PredictionSchema),
  values: z.array(ValueSchema),

  // Metadata about the analysis
  analysisMetadata: z.object({
    totalSentencesAnalyzed: z.number().int().min(0),
    modelUsed: z.string(),
    timestamp: z.string().datetime(),
  }),
});

export type ArgumentDecompositionResult = z.infer<typeof ArgumentDecompositionResultSchema>;

// ============================================
// Omission Schema
// ============================================

export const OmissionTypeSchema = z.enum([
  'data_source',
  'timeframe',
  'stakeholder',
  'cost',
  'counterargument',
  'implementation',
  'historical_context',
  'alternative',
]);

export type OmissionType = z.infer<typeof OmissionTypeSchema>;

export const DetectionMethodSchema = z.enum([
  'deterministic',
  'llm_detected',
  'pattern_match',
]);

export type DetectionMethod = z.infer<typeof DetectionMethodSchema>;

export const OmissionSchema = z.object({
  id: z.string().uuid(),
  omissionType: OmissionTypeSchema,
  detectionMethod: DetectionMethodSchema,
  description: z.string().min(10),
  whyItMatters: z.string().optional(),
  relatedSentences: z.array(SentenceReferenceSchema).optional(),
});

export type Omission = z.infer<typeof OmissionSchema>;

// ============================================
// Context Card Schema
// ============================================

export const ContextForSchema = z.enum(['claim', 'assumption', 'omission', 'general']);

export type ContextFor = z.infer<typeof ContextForSchema>;

export const KeyFactSchema = z.object({
  fact: z.string(),
  citationIndex: z.number().int().min(0),
});

export type KeyFact = z.infer<typeof KeyFactSchema>;

export const ContextCardSchema = z.object({
  id: z.string().uuid(),
  contextFor: ContextForSchema,
  relatedElementId: z.string().uuid().optional(),
  title: z.string().max(255),
  summary: z.string(),
  keyFacts: z.array(KeyFactSchema),
  citations: z.array(z.object({
    url: z.string().url(),
    title: z.string(),
    domain: z.string(),
    snippet: z.string().optional(),
  })),
});

export type ContextCard = z.infer<typeof ContextCardSchema>;
