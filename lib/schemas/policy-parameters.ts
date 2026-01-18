import { z } from 'zod';

// ============================================
// Policy Types
// ============================================

export const PolicyTypeSchema = z.enum([
  'tax_change',
  'tax_credit',
  'benefit_new',
  'benefit_modification',
  'benefit_elimination',
  'subsidy',
  'mandate',
  'regulation',
  'other',
]);

export type PolicyType = z.infer<typeof PolicyTypeSchema>;

// ============================================
// Income Bracket Schema (for tax changes)
// ============================================

export const IncomeBracketSchema = z.object({
  minIncome: z.number(),
  maxIncome: z.number().nullable(), // null = no upper limit
  currentRate: z.number().min(0).max(1).optional(),
  newRate: z.number().min(0).max(1).optional(),
  changeAmount: z.number().optional(), // For flat amount changes
});

export type IncomeBracket = z.infer<typeof IncomeBracketSchema>;

// ============================================
// Eligibility Criteria Schema
// ============================================

export const EligibilityCriterionSchema = z.object({
  field: z.string(), // e.g., "household_income", "age", "state"
  operator: z.enum(['equals', 'not_equals', 'less_than', 'less_than_or_equal', 'greater_than', 'greater_than_or_equal', 'in', 'not_in']),
  value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]),
});

export type EligibilityCriterion = z.infer<typeof EligibilityCriterionSchema>;

export const EligibilitySchema = z.object({
  criteria: z.array(EligibilityCriterionSchema),
  logic: z.enum(['all', 'any']).default('all'), // AND vs OR
});

export type Eligibility = z.infer<typeof EligibilitySchema>;

// ============================================
// Calculation Formula Schema
// ============================================

export const CalculationFormulaSchema = z.object({
  formulaId: z.string(),
  name: z.string(),
  description: z.string(),
  expression: z.string(), // e.g., "household_income * 0.02 - current_credit"
  requiredInputs: z.array(z.string()), // profile fields needed
  outputUnit: z.enum(['dollars', 'percentage', 'boolean']),
  // Indicates what a positive result means for the user:
  // - 'benefit': positive = user saves money or gains value (e.g., tax credits, subsidies)
  // - 'burden': positive = user pays more or loses value (e.g., tax increases, fees)
  impactSemantics: z.enum(['benefit', 'burden']).default('benefit'),
});

export type CalculationFormula = z.infer<typeof CalculationFormulaSchema>;

// ============================================
// Policy Parameters (when extracted)
// ============================================

export const PolicyParametersSchema = z.object({
  // Timing
  effectiveDate: z.string().optional(), // ISO date or description
  sunsetDate: z.string().optional(),

  // For tax changes
  incomeBrackets: z.array(IncomeBracketSchema).optional(),
  taxType: z.enum(['income', 'payroll', 'capital_gains', 'sales', 'property', 'other']).optional(),

  // For benefits
  eligibility: EligibilitySchema.optional(),
  benefitAmount: z.number().optional(), // Fixed amount
  benefitFormula: z.string().optional(), // Formula for variable amounts

  // For regulations/mandates
  complianceCost: z.number().optional(),
  affectedPopulation: z.string().optional(),

  // General
  implementationCost: z.number().optional(),
  projectedRevenue: z.number().optional(),
  projectedSavings: z.number().optional(),
});

export type PolicyParameters = z.infer<typeof PolicyParametersSchema>;

// ============================================
// Policy Parameter Result (discriminated union)
// ============================================

export const PolicyParameterResultSchema = z.discriminatedUnion('extractionStatus', [
  // Successfully extracted parameters
  z.object({
    extractionStatus: z.literal('extracted'),
    policyType: PolicyTypeSchema,
    parameters: PolicyParametersSchema,
    calculationFormulas: z.array(CalculationFormulaSchema),
    sourceSentences: z.array(z.number().int().min(0)).optional(),
  }),

  // Insufficient detail to extract
  z.object({
    extractionStatus: z.literal('insufficient_detail'),
    reason: z.string(),
    missingInformation: z.array(z.string()),
    partialParameters: PolicyParametersSchema.optional(), // What we could extract
  }),

  // Article doesn't discuss quantifiable policy
  z.object({
    extractionStatus: z.literal('not_applicable'),
    reason: z.string(),
  }),
]);

export type PolicyParameterResult = z.infer<typeof PolicyParameterResultSchema>;

// Helper type guards
export function isExtracted(result: PolicyParameterResult): result is Extract<PolicyParameterResult, { extractionStatus: 'extracted' }> {
  return result.extractionStatus === 'extracted';
}

export function isInsufficientDetail(result: PolicyParameterResult): result is Extract<PolicyParameterResult, { extractionStatus: 'insufficient_detail' }> {
  return result.extractionStatus === 'insufficient_detail';
}

export function isNotApplicable(result: PolicyParameterResult): result is Extract<PolicyParameterResult, { extractionStatus: 'not_applicable' }> {
  return result.extractionStatus === 'not_applicable';
}
