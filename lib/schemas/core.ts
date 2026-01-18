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
  id: z.string().uuid().nullish(),

  // Basic Demographics
  age: z.number().int().min(0).max(150).nullish(),
  state: z.string().length(2).nullish(),
  city: z.string().max(100).nullish(),
  zip_code: z.string().max(10).nullish(),
  household_size: z.number().int().min(1).nullish(),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed', 'separated']).nullish(),

  // Income & Employment
  employment_status: z.enum([
    'employed_full_time',
    'employed_part_time',
    'self_employed',
    'unemployed',
    'retired',
    'student',
    'disabled',
  ]).nullish(),
  individual_income: z.number().min(0).nullish(),
  household_income: z.number().min(0).nullish(),
  tax_filing_status: z.enum([
    'single',
    'married_filing_jointly',
    'married_filing_separately',
    'head_of_household',
    'qualifying_widow',
  ]).nullish(),
  industry: z.string().max(100).nullish(),

  // Housing & Finances
  rent_vs_own: z.enum(['rent', 'own', 'other']).nullish(),
  annual_housing_payment: z.number().min(0).nullish(),
  student_loan_balance: z.number().min(0).nullish(),
  other_debts: z.number().min(0).nullish(),

  // Healthcare
  insurance_status: z.enum(['insured', 'uninsured', 'underinsured']).nullish(),
  insurance_type: z.enum([
    'employer',
    'marketplace',
    'medicaid',
    'medicare',
    'va',
    'tricare',
    'private',
    'none',
  ]).nullish(),
  dependents_covered: z.number().int().min(0).nullish(),

  // Education
  student_status: z.enum(['not_student', 'part_time', 'full_time']).nullish(),
  institution_type: z.enum([
    'public_2year',
    'public_4year',
    'private_nonprofit',
    'private_forprofit',
    'none',
  ]).nullish(),
  in_state_vs_out_of_state: z.enum(['in_state', 'out_of_state', 'not_applicable']).nullish(),

  // Current Benefits
  current_benefits: CurrentBenefitsSchema.nullish(),

  // Assets
  retirement_accounts: z.number().min(0).nullish(),
  investment_accounts: z.number().min(0).nullish(),
  home_equity: z.number().min(0).nullish(),

  // Life Plans
  planning_home_purchase: z.boolean().nullish(),
  planning_retirement_soon: z.boolean().nullish(),
  planning_children: z.boolean().nullish(),
  planning_start_business: z.boolean().nullish(),

  // Work Details
  is_gig_worker: z.boolean().nullish(),
  is_union_member: z.boolean().nullish(),
  is_small_business_owner: z.boolean().nullish(),
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
