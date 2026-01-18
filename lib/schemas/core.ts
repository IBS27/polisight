import { z } from 'zod';

// ============================================
// Base Reference Schemas
// ============================================

export const SentenceReferenceSchema = z.object({
  sentenceIndex: z.number().int().min(0),
  relevance: z.enum(['primary', 'supporting', 'contextual']).optional(),
});

export type SentenceReference = z.infer<typeof SentenceReferenceSchema>;

export const CitationSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  snippet: z.string().optional(),
  domain: z.string(),
});

export type Citation = z.infer<typeof CitationSchema>;

// ============================================
// User Profile Schema
// ============================================

export const CurrentBenefitsSchema = z.object({
  snap: z.boolean().optional(),
  medicaid: z.boolean().optional(),
  medicare: z.boolean().optional(),
  pell_grant: z.boolean().optional(),
  child_tax_credit: z.boolean().optional(),
  earned_income_tax_credit: z.boolean().optional(),
  other_programs: z.array(z.string()).optional(),
});

export type CurrentBenefits = z.infer<typeof CurrentBenefitsSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid().optional(),

  // Basic Demographics
  age: z.number().int().min(0).max(150).optional(),
  state: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
  zip_code: z.string().max(10).optional(),
  household_size: z.number().int().min(1).optional(),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed', 'separated']).optional(),

  // Income & Employment
  employment_status: z.enum([
    'employed_full_time',
    'employed_part_time',
    'self_employed',
    'unemployed',
    'retired',
    'student',
    'disabled',
  ]).optional(),
  individual_income: z.number().min(0).optional(),
  household_income: z.number().min(0).optional(),
  tax_filing_status: z.enum([
    'single',
    'married_filing_jointly',
    'married_filing_separately',
    'head_of_household',
    'qualifying_widow',
  ]).optional(),
  industry: z.string().max(100).optional(),

  // Housing & Finances
  rent_vs_own: z.enum(['rent', 'own', 'other']).optional(),
  annual_housing_payment: z.number().min(0).optional(),
  student_loan_balance: z.number().min(0).optional(),
  other_debts: z.number().min(0).optional(),

  // Healthcare
  insurance_status: z.enum(['insured', 'uninsured', 'underinsured']).optional(),
  insurance_type: z.enum([
    'employer',
    'marketplace',
    'medicaid',
    'medicare',
    'va',
    'tricare',
    'private',
    'none',
  ]).optional(),
  dependents_covered: z.number().int().min(0).optional(),

  // Education
  student_status: z.enum(['not_student', 'part_time', 'full_time']).optional(),
  institution_type: z.enum([
    'public_2year',
    'public_4year',
    'private_nonprofit',
    'private_forprofit',
    'none',
  ]).optional(),
  in_state_vs_out_of_state: z.enum(['in_state', 'out_of_state', 'not_applicable']).optional(),

  // Current Benefits
  current_benefits: CurrentBenefitsSchema.optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// ============================================
// Article Schema
// ============================================

export const ArticleStatusSchema = z.enum([
  'pending',
  'extracting',
  'extracted',
  'analyzing',
  'analyzed',
  'error',
]);

export type ArticleStatus = z.infer<typeof ArticleStatusSchema>;

export const ArticleSchema = z.object({
  id: z.string().uuid().optional(),
  source_url: z.string().url(),
  title: z.string().min(1),
  clean_text: z.string().min(1),
  author: z.string().optional(),
  publish_date: z.string().datetime().optional(),
  site_name: z.string().optional(),
  status: ArticleStatusSchema.default('pending'),
  error_message: z.string().optional(),
});

export type Article = z.infer<typeof ArticleSchema>;

// ============================================
// Sentence Span Schema
// ============================================

export const SentenceSpanSchema = z.object({
  id: z.string().uuid().optional(),
  article_id: z.string().uuid(),
  sentence_index: z.number().int().min(0),
  text: z.string().min(1),
  start_char: z.number().int().min(0),
  end_char: z.number().int().min(0),
  paragraph_index: z.number().int().min(0).optional(),
});

export type SentenceSpan = z.infer<typeof SentenceSpanSchema>;

// ============================================
// Provenance Schema
// ============================================

export const ProvenanceActionSchema = z.enum([
  'created',
  'extracted',
  'analyzed',
  'validated',
  'calculated',
  'updated',
  'error',
]);

export type ProvenanceAction = z.infer<typeof ProvenanceActionSchema>;

export const ApiProviderSchema = z.enum(['openrouter', 'perplexity', 'diffbot', 'grok']);

export type ApiProvider = z.infer<typeof ApiProviderSchema>;

export const ProvenanceLogSchema = z.object({
  id: z.string().uuid().optional(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  article_id: z.string().uuid().optional(),
  action: ProvenanceActionSchema,
  description: z.string(),
  input_data: z.unknown().optional(),
  output_data: z.unknown().optional(),
  llm_model: z.string().optional(),
  llm_prompt: z.string().optional(),
  llm_response: z.string().optional(),
  duration_ms: z.number().int().optional(),
  api_provider: ApiProviderSchema.optional(),
});

export type ProvenanceLog = z.infer<typeof ProvenanceLogSchema>;
