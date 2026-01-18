import { callGeminiWithSchema, LLMCallResult } from './gemini';
import {
  ImpactBulletsLLMResponseSchema,
  ImpactBulletsResponse,
  type ImpactBulletsLLMResponse,
} from '@/lib/schemas/impact-bullets';
import type { UserProfile } from '@/lib/schemas/core';

// ============================================
// Types
// ============================================

interface PolicyClaim {
  id: string;
  content: string;
  claimType: string;
  confidence: number;
}

interface ArticleData {
  id: string;
  title: string;
  cleanText: string;
}

export interface GenerateImpactBulletsResult {
  response: ImpactBulletsResponse;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

// ============================================
// Profile Summary Builder
// ============================================

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'Not specified';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function buildProfileSummary(profile: UserProfile): string {
  const lines: string[] = [];

  // Demographics
  if (profile.age != null) lines.push(`Age: ${profile.age}`);
  if (profile.state) lines.push(`State: ${profile.state}`);
  if (profile.household_size != null) lines.push(`Household size: ${profile.household_size}`);
  if (profile.marital_status) lines.push(`Marital status: ${profile.marital_status}`);

  // Income & Employment
  if (profile.employment_status) lines.push(`Employment: ${profile.employment_status.replace(/_/g, ' ')}`);
  if (profile.individual_income != null) lines.push(`Individual income: ${formatCurrency(profile.individual_income)}/year`);
  if (profile.household_income != null) lines.push(`Household income: ${formatCurrency(profile.household_income)}/year`);
  if (profile.tax_filing_status) lines.push(`Tax filing: ${profile.tax_filing_status.replace(/_/g, ' ')}`);
  if (profile.industry) lines.push(`Industry: ${profile.industry}`);
  if (profile.is_small_business_owner) lines.push(`Small business owner`);
  if (profile.is_gig_worker) lines.push(`Gig worker`);

  // Housing
  if (profile.rent_vs_own) lines.push(`Housing: ${profile.rent_vs_own === 'rent' ? 'Rents' : 'Owns'}`);
  if (profile.annual_housing_payment != null) lines.push(`Annual housing cost: ${formatCurrency(profile.annual_housing_payment)}`);

  // Healthcare
  if (profile.insurance_type) lines.push(`Insurance: ${profile.insurance_type}`);

  // Education
  if (profile.student_status && profile.student_status !== 'not_student') {
    lines.push(`Student: ${profile.student_status.replace(/_/g, ' ')}`);
  }
  if (profile.student_loan_balance != null && profile.student_loan_balance > 0) {
    lines.push(`Student loans: ${formatCurrency(profile.student_loan_balance)}`);
  }

  // Benefits
  if (profile.current_benefits) {
    const benefits: string[] = [];
    if (profile.current_benefits.snap) benefits.push('SNAP');
    if (profile.current_benefits.medicaid) benefits.push('Medicaid');
    if (profile.current_benefits.medicare) benefits.push('Medicare');
    if (profile.current_benefits.pell_grant) benefits.push('Pell Grant');
    if (profile.current_benefits.child_tax_credit) benefits.push('Child Tax Credit');
    if (profile.current_benefits.earned_income_tax_credit) benefits.push('EITC');
    if (benefits.length > 0) lines.push(`Current benefits: ${benefits.join(', ')}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'No profile information provided';
}

// ============================================
// Prompt Builder
// ============================================

function buildImpactPrompt(
  article: ArticleData,
  claims: PolicyClaim[],
  profile: UserProfile
): string {
  const profileSummary = buildProfileSummary(profile);
  const articleText = article.cleanText.slice(0, 6000);

  const claimsText = claims.length > 0
    ? claims.slice(0, 10).map((c, i) => `${i + 1}. ${c.content}`).join('\n')
    : 'No specific claims extracted.';

  return `Analyze how this policy article affects the specific person described below.

ARTICLE: "${article.title}"
${articleText}

KEY CLAIMS:
${claimsText}

PERSON'S PROFILE:
${profileSummary}

Generate 3-6 bullet points explaining how this policy could affect THIS SPECIFIC PERSON. Be concrete and personal. Only mention impacts relevant to their situation.

Respond with JSON in this exact format:
{
  "bullets": [
    {"text": "Your specific impact description", "sentiment": "positive"},
    {"text": "Another impact", "sentiment": "negative"},
    {"text": "Neutral impact", "sentiment": "neutral"}
  ],
  "summary": "One sentence overall summary"
}

Rules:
- sentiment must be exactly "positive", "negative", or "neutral"
- Be specific to this person's income, location, employment, etc.
- Skip impacts that don't apply to them
- Include dollar amounts when reasonable to estimate`;
}

// ============================================
// Main Generator Function
// ============================================

export async function generateImpactBullets(
  article: ArticleData,
  claims: PolicyClaim[],
  profile: UserProfile
): Promise<GenerateImpactBulletsResult> {
  const prompt = buildImpactPrompt(article, claims, profile);

  const result: LLMCallResult<ImpactBulletsLLMResponse> = await callGeminiWithSchema(
    prompt,
    ImpactBulletsLLMResponseSchema,
    {
      systemPrompt: 'You analyze policy impacts for specific individuals. Respond with valid JSON only.',
      temperature: 0.3,
      maxTokens: 2048,
    }
  );

  return {
    response: result.data,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}
