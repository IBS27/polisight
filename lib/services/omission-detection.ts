import { z } from 'zod';
import type { SentenceSpan } from './sentence-segmentation';
import type { OmissionType, DetectionMethod } from '@/lib/schemas/argument-decomposition';
import { OmissionTypeSchema } from '@/lib/schemas/argument-decomposition';
import { callGeminiWithSchema, type LLMCallResult } from './gemini';

// ============================================
// Omission Detection Result
// ============================================

export interface DetectedOmission {
  omissionType: OmissionType;
  detectionMethod: DetectionMethod;
  description: string;
  whyItMatters: string;
}

// ============================================
// LLM Response Schema
// ============================================

const LLMOmissionResponseSchema = z.object({
  omissions: z.array(z.object({
    type: OmissionTypeSchema,
    description: z.string(),
    whyItMatters: z.string(),
  })),
});

type LLMOmissionResponse = z.infer<typeof LLMOmissionResponseSchema>;

// ============================================
// LLM-Based Detection Function
// ============================================

export async function detectOmissionsWithLLM(
  sentences: SentenceSpan[],
  articleTitle: string
): Promise<{
  omissions: DetectedOmission[];
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}> {
  // Format sentences with indices for the prompt
  const formattedSentences = sentences
    .map((s, i) => `${i}: ${s.text}`)
    .join('\n');

  const prompt = `You are analyzing a policy article to identify what it does NOT tell the reader.

Do not fact-check or verify claims - that is not your purpose.

Instead, identify:
- Information the article omits that would help readers form a complete opinion
- Vague language that sounds informative but lacks specifics
- Unstated assumptions the article relies on
- Missing context that could change how a reader interprets the content

ARTICLE: ${articleTitle}

SENTENCES:
${formattedSentences}

Return JSON with this EXACT structure:
{
  "omissions": [
    {
      "type": "stakeholder",
      "description": "Article claims policy 'benefits families' without specifying income levels, family sizes, or eligibility criteria",
      "whyItMatters": "Readers cannot determine if they personally would benefit"
    }
  ]
}

OMISSION TYPES (use exactly these values):
- data_source: Claims without cited sources
- timeframe: Policies without implementation timelines
- stakeholder: Affected groups vaguely described or not identified
- cost: Financial implications not quantified
- counterargument: Opposing viewpoints not acknowledged
- implementation: How policy works not explained
- historical_context: Relevant precedent not mentioned
- alternative: Other approaches not discussed

GUIDELINES:
- Only report genuine omissions that would meaningfully help readers
- Be specific - reference actual vague phrases from the article in your descriptions
- Limit to 3-7 most significant omissions`;

  const result: LLMCallResult<LLMOmissionResponse> = await callGeminiWithSchema(
    prompt,
    LLMOmissionResponseSchema,
    {
      temperature: 0.1,
      systemPrompt: 'You are an expert policy analyst identifying what articles omit. Be specific and reference actual text from the article.',
    }
  );

  // Convert LLM response to DetectedOmission format
  const omissions: DetectedOmission[] = result.data.omissions.map(o => ({
    omissionType: o.type,
    detectionMethod: 'llm_detected' as DetectionMethod,
    description: o.description,
    whyItMatters: o.whyItMatters,
  }));

  return {
    omissions,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}

// ============================================
// Convert to Full Omission Schema
// ============================================

export function toOmissionRecords(
  articleId: string,
  detections: DetectedOmission[]
): Array<{
  id: string;
  article_id: string;
  omission_type: OmissionType;
  detection_method: DetectionMethod;
  description: string;
  why_it_matters: string;
}> {
  return detections.map(d => ({
    id: crypto.randomUUID(),
    article_id: articleId,
    omission_type: d.omissionType,
    detection_method: d.detectionMethod,
    description: d.description,
    why_it_matters: d.whyItMatters,
  }));
}
