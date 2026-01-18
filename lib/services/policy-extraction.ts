import { z } from 'zod';
import { callGeminiWithSchema } from './gemini';
import type { SentenceSpan } from './sentence-segmentation';
import type { PolicyParameterResult } from '@/lib/schemas/policy-parameters';

// ============================================
// LLM Response Schema
// ============================================

const LLMPolicyResponseSchema = z.discriminatedUnion('extractionStatus', [
  z.object({
    extractionStatus: z.literal('extracted'),
    policyType: z.enum([
      'tax_change', 'tax_credit', 'benefit_new', 'benefit_modification',
      'benefit_elimination', 'subsidy', 'mandate', 'regulation', 'other'
    ]),
    parameters: z.object({
      effectiveDate: z.string().optional(),
      sunsetDate: z.string().optional(),
      incomeBrackets: z.array(z.object({
        minIncome: z.number(),
        maxIncome: z.number().nullable(),
        currentRate: z.number().optional(),
        newRate: z.number().optional(),
        changeAmount: z.number().optional(),
      })).optional(),
      taxType: z.enum(['income', 'payroll', 'capital_gains', 'sales', 'property', 'other']).optional(),
      eligibility: z.object({
        criteria: z.array(z.object({
          field: z.string(),
          operator: z.enum(['equals', 'not_equals', 'less_than', 'less_than_or_equal', 'greater_than', 'greater_than_or_equal', 'in', 'not_in']),
          value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]),
        })),
        logic: z.enum(['all', 'any']).optional(),
      }).optional(),
      benefitAmount: z.number().optional(),
      benefitFormula: z.string().optional(),
      complianceCost: z.number().optional(),
      affectedPopulation: z.string().optional(),
      implementationCost: z.number().optional(),
      projectedRevenue: z.number().optional(),
      projectedSavings: z.number().optional(),
    }),
    calculationFormulas: z.array(z.object({
      formulaId: z.string(),
      name: z.string(),
      description: z.string(),
      expression: z.string(),
      requiredInputs: z.array(z.string()),
      outputUnit: z.enum(['dollars', 'percentage', 'boolean']),
      impactSemantics: z.enum(['benefit', 'burden']).optional().default('benefit'),
    })),
    sourceSentenceIndices: z.array(z.number()).optional(),
  }),
  z.object({
    extractionStatus: z.literal('insufficient_detail'),
    reason: z.string(),
    missingInformation: z.array(z.string()),
    partialParameters: z.object({
      effectiveDate: z.string().optional(),
      policyDescription: z.string().optional(),
    }).optional(),
  }),
  z.object({
    extractionStatus: z.literal('not_applicable'),
    reason: z.string(),
  }),
]);

type LLMPolicyResponse = z.infer<typeof LLMPolicyResponseSchema>;

// ============================================
// Build Extraction Prompt
// ============================================

function buildExtractionPrompt(
  title: string,
  sentences: SentenceSpan[],
  claims: Array<{ content: string; claimType: string }>
): string {
  const numberedSentences = sentences
    .map((s) => `${s.sentenceIndex}: ${s.text}`)
    .join('\n');

  const policyClaimsList = claims
    .filter(c => c.claimType === 'policy' || c.claimType === 'causal')
    .map(c => `- ${c.content}`)
    .join('\n');

  return `You are an expert policy analyst. Extract specific, quantifiable policy parameters from this article that could be used to calculate personal financial impact.

ARTICLE TITLE: ${title}

SENTENCES:
${numberedSentences}

POLICY-RELATED CLAIMS IDENTIFIED:
${policyClaimsList || '(none identified)'}

Your task: Determine if this article contains enough specific details to calculate how a policy would financially affect an individual.

EXTRACTION CRITERIA:
1. Look for specific tax rate changes with income brackets
2. Look for benefit amounts, eligibility criteria, phase-outs
3. Look for effective dates and duration
4. Look for formulas or rules that determine amounts

RESPONSE OPTIONS (respond with valid JSON matching one of these structures):

IMPORTANT - Valid enum values (you MUST use ONLY these exact values):
- policyType: "tax_change" | "tax_credit" | "benefit_new" | "benefit_modification" | "benefit_elimination" | "subsidy" | "mandate" | "regulation" | "other"
- taxType: "income" | "payroll" | "capital_gains" | "sales" | "property" | "other"
- outputUnit: "dollars" | "percentage" | "boolean"
- impactSemantics: "benefit" | "burden"
  - Use "benefit" when positive formula result = user SAVES money (tax cuts, credits, subsidies)
  - Use "burden" when positive formula result = user PAYS MORE (tax increases, fees, penalties)

Option 1 - "extracted": Use when you find specific, quantifiable parameters
- Include calculation formulas using profile fields like: household_income, individual_income, age, state, household_size, filing_status
- Example formula: "household_income * 0.02" or "max(0, 12000 - household_income * 0.05)"

Example JSON for Option 1 (tax cut = benefit):
{
  "extractionStatus": "extracted",
  "policyType": "tax_change",
  "parameters": {
    "effectiveDate": "2025-01-01",
    "incomeBrackets": [{"minIncome": 0, "maxIncome": 50000, "currentRate": 0.10, "newRate": 0.08}],
    "taxType": "income"
  },
  "calculationFormulas": [{
    "formulaId": "tax_savings",
    "name": "Tax Savings",
    "description": "Annual tax savings from rate reduction",
    "expression": "household_income * 0.02",
    "requiredInputs": ["household_income"],
    "outputUnit": "dollars",
    "impactSemantics": "benefit"
  }],
  "sourceSentenceIndices": [1, 5, 12]
}

Example JSON for Option 1 (tax increase = burden):
{
  "extractionStatus": "extracted",
  "policyType": "tax_change",
  "parameters": {
    "effectiveDate": "2025-01-01",
    "incomeBrackets": [{"minIncome": 1000000, "maxIncome": null, "currentRate": 0.039, "newRate": 0.059}],
    "taxType": "income"
  },
  "calculationFormulas": [{
    "formulaId": "additional_tax",
    "name": "Additional Tax Liability",
    "description": "Additional annual tax from rate increase on income over $1M",
    "expression": "max(0, individual_income - 1000000) * 0.02",
    "requiredInputs": ["individual_income"],
    "outputUnit": "dollars",
    "impactSemantics": "burden"
  }],
  "sourceSentenceIndices": [1, 5, 12]
}

Option 2 - "insufficient_detail": Use when the article discusses policy but lacks specific numbers
- Explain what information is missing
- Include any partial parameters you could extract

Example JSON for Option 2:
{
  "extractionStatus": "insufficient_detail",
  "reason": "Article mentions tax cuts but does not specify rates or income brackets",
  "missingInformation": ["specific tax rates", "income thresholds", "effective date"],
  "partialParameters": {
    "policyDescription": "Proposed income tax reduction for middle class"
  }
}

Option 3 - "not_applicable": Use when the article doesn't discuss quantifiable policy changes
- Explain why (e.g., opinion piece, historical analysis, no financial impact)

Example JSON for Option 3:
{
  "extractionStatus": "not_applicable",
  "reason": "Article is an opinion piece about policy philosophy without specific proposals"
}

CRITICAL REQUIREMENTS:
1. The discriminator field MUST be named "extractionStatus" (not "status")
2. All enum fields MUST use ONLY the exact values listed above:
   - policyType must be one of: tax_change, tax_credit, benefit_new, benefit_modification, benefit_elimination, subsidy, mandate, regulation, other
   - taxType must be one of: income, payroll, capital_gains, sales, property, other
   - outputUnit must be one of: dollars, percentage, boolean
   - impactSemantics must be one of: benefit, burden
3. Do NOT use descriptive text for enum fields (e.g., use "income" not "NYC Personal Income Tax")
4. CRITICAL for impactSemantics: Tax INCREASES and new fees use "burden". Tax CUTS and credits use "benefit"

Be conservative: Only return "extracted" if you have enough detail to write a calculation formula.`;
}

// ============================================
// Main Extraction Function
// ============================================

export async function extractPolicyParameters(
  articleId: string,
  title: string,
  sentences: SentenceSpan[],
  claims: Array<{ content: string; claimType: string }>
): Promise<{
  result: PolicyParameterResult;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  prompt: string;
  rawResponse: string;
}> {
  const prompt = buildExtractionPrompt(title, sentences, claims);

  const llmResult = await callGeminiWithSchema(
    prompt,
    LLMPolicyResponseSchema,
    {
      systemPrompt: 'You are a policy analyst specializing in extracting quantifiable parameters. Be precise and conservative - only extract parameters you are confident about.',
      temperature: 0.1,
      maxTokens: 4096,
    }
  );

  return {
    result: llmResult.data as PolicyParameterResult,
    model: llmResult.model,
    promptTokens: llmResult.promptTokens,
    completionTokens: llmResult.completionTokens,
    prompt,
    rawResponse: llmResult.rawResponse,
  };
}
