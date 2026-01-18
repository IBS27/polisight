import { z } from 'zod';

// ============================================
// Impact Units and Direction
// ============================================

export const ImpactUnitSchema = z.enum([
  'dollars_annual',
  'dollars_monthly',
  'dollars_one_time',
  'percentage',
  'qualitative',
]);

export type ImpactUnit = z.infer<typeof ImpactUnitSchema>;

export const ImpactDirectionSchema = z.enum([
  'positive',  // User benefits (saves money, gains benefit)
  'negative',  // User loses (pays more, loses benefit)
  'neutral',   // No significant impact
  'mixed',     // Some positive, some negative aspects
]);

export type ImpactDirection = z.infer<typeof ImpactDirectionSchema>;

// ============================================
// Calculation Step Schema
// ============================================

export const CalculationStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  description: z.string(),
  formula: z.string().optional(), // The formula used
  inputs: z.record(z.string(), z.union([z.string(), z.number()])), // Input values used
  result: z.number(),
  unit: z.string().optional(),
});

export type CalculationStep = z.infer<typeof CalculationStepSchema>;

// ============================================
// Caveat Schema
// ============================================

export const CaveatSeveritySchema = z.enum(['low', 'medium', 'high']);

export type CaveatSeverity = z.infer<typeof CaveatSeveritySchema>;

export const CaveatTypeSchema = z.enum([
  'assumption',         // Calculation assumes something
  'approximation',      // Value is approximate
  'missing_data',       // Some data was unavailable
  'policy_uncertainty', // Policy details unclear
  'timing',            // Impact depends on timing
  'eligibility',       // Eligibility not certain
  'interaction',       // May interact with other policies
]);

export type CaveatType = z.infer<typeof CaveatTypeSchema>;

export const CaveatSchema = z.object({
  type: CaveatTypeSchema,
  description: z.string(),
  severity: CaveatSeveritySchema,
  affectsConfidence: z.boolean().default(true),
});

export type Caveat = z.infer<typeof CaveatSchema>;

// ============================================
// Missing Input Schema
// ============================================

export const MissingInputSchema = z.object({
  field: z.string(), // The profile field that's missing
  fieldLabel: z.string(), // Human-readable label
  reason: z.string(), // Why it's needed
  impact: z.string(), // What happens without it
  isRequired: z.boolean(), // Is it absolutely required or just helpful
});

export type MissingInput = z.infer<typeof MissingInputSchema>;

// ============================================
// Calculation Breakdown Schema
// ============================================

export const CalculationBreakdownSchema = z.object({
  steps: z.array(CalculationStepSchema),
  inputsUsed: z.record(z.string(), z.union([z.string(), z.number()])),
  formulaUsed: z.string().optional(),
  intermediateResults: z.record(z.string(), z.number()).optional(),
});

export type CalculationBreakdown = z.infer<typeof CalculationBreakdownSchema>;

// ============================================
// Impact Calculation Result (discriminated union)
// ============================================

export const ImpactCalculationResultSchema = z.discriminatedUnion('calculationStatus', [
  // Successfully computed
  z.object({
    calculationStatus: z.literal('computed'),
    primaryImpactValue: z.number(),
    impactUnit: ImpactUnitSchema,
    impactDirection: ImpactDirectionSchema,
    calculationBreakdown: CalculationBreakdownSchema,
    caveats: z.array(CaveatSchema),
    confidenceLevel: z.number().min(0).max(1).optional(),

    // Optional: comparison to average
    comparisonToAverage: z.object({
      averageImpact: z.number(),
      userPercentile: z.number().min(0).max(100),
      description: z.string(),
    }).optional(),
  }),

  // Cannot compute
  z.object({
    calculationStatus: z.literal('cannot_compute'),
    reason: z.string(),
    missingInputs: z.array(MissingInputSchema),
    // What we could partially determine
    partialAnalysis: z.string().optional(),
    // Estimated impact range if we could make assumptions
    estimatedRange: z.object({
      min: z.number(),
      max: z.number(),
      unit: ImpactUnitSchema,
      assumptions: z.array(z.string()),
    }).optional(),
  }),
]);

export type ImpactCalculationResult = z.infer<typeof ImpactCalculationResultSchema>;

// Helper type guards
export function isComputed(result: ImpactCalculationResult): result is Extract<ImpactCalculationResult, { calculationStatus: 'computed' }> {
  return result.calculationStatus === 'computed';
}

export function isCannotCompute(result: ImpactCalculationResult): result is Extract<ImpactCalculationResult, { calculationStatus: 'cannot_compute' }> {
  return result.calculationStatus === 'cannot_compute';
}

// ============================================
// Combined Impact Display Data
// ============================================

export const ImpactDisplayDataSchema = z.object({
  // Core result
  result: ImpactCalculationResultSchema,

  // For UI display
  headline: z.string(), // e.g., "You would save $1,200/year"
  explanation: z.string(), // Plain language explanation
  confidenceStatement: z.string(), // e.g., "Based on your complete profile"

  // Related policy info
  policyName: z.string().optional(),
  policyType: z.string().optional(),

  // Actions
  profileCompleteness: z.number().min(0).max(100),
  missingFieldsForBetterEstimate: z.array(z.string()),
});

export type ImpactDisplayData = z.infer<typeof ImpactDisplayDataSchema>;
