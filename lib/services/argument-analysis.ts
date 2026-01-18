import { z } from 'zod';
import { callGeminiWithSchema } from './gemini';
import type { SentenceSpan } from './sentence-segmentation';
import {
  ArgumentDecompositionResultSchema,
  type ArgumentDecompositionResult,
} from '@/lib/schemas/argument-decomposition';

// ============================================
// LLM Response Schema (simplified for parsing)
// ============================================

const LLMArgumentResponseSchema = z.object({
  claims: z.array(z.object({
    content: z.string(),
    sourceSentenceIndices: z.array(z.number()),
    confidence: z.number(),
    isVerifiable: z.boolean(),
    claimType: z.enum(['factual', 'causal', 'evaluative', 'policy']),
  })),
  assumptions: z.array(z.object({
    content: z.string(),
    sourceSentenceIndices: z.array(z.number()),
    confidence: z.number(),
    isExplicit: z.boolean(),
    criticality: z.enum(['low', 'medium', 'high', 'critical']),
  })),
  predictions: z.array(z.object({
    content: z.string(),
    sourceSentenceIndices: z.array(z.number()),
    confidence: z.number(),
    timeframe: z.string().optional(),
    conditions: z.string().optional(),
    isConditional: z.boolean(),
  })),
  values: z.array(z.object({
    content: z.string(),
    sourceSentenceIndices: z.array(z.number()),
    confidence: z.number(),
    category: z.enum([
      'economic', 'liberty', 'equality', 'security', 'tradition',
      'progress', 'environment', 'fairness', 'efficiency', 'other'
    ]),
    isExplicit: z.boolean(),
  })),
});

type LLMArgumentResponse = z.infer<typeof LLMArgumentResponseSchema>;

// ============================================
// Build Analysis Prompt
// ============================================

function buildAnalysisPrompt(
  title: string,
  sentences: SentenceSpan[]
): string {
  const numberedSentences = sentences
    .map((s) => `${s.sentenceIndex}: ${s.text}`)
    .join('\n');

  return `Analyze this article and extract its arguments. Return a JSON object with these exact fields.

ARTICLE: ${title}

SENTENCES:
${numberedSentences}

Return JSON with this EXACT structure:
{
  "claims": [
    {
      "content": "string (the claim text)",
      "sourceSentenceIndices": [0, 1],
      "confidence": 0.9,
      "isVerifiable": true,
      "claimType": "factual"
    }
  ],
  "assumptions": [
    {
      "content": "string (the assumption)",
      "sourceSentenceIndices": [0],
      "confidence": 0.8,
      "isExplicit": false,
      "criticality": "high"
    }
  ],
  "predictions": [
    {
      "content": "string (the prediction)",
      "sourceSentenceIndices": [0],
      "confidence": 0.7,
      "timeframe": "string or null",
      "conditions": "string or null",
      "isConditional": true
    }
  ],
  "values": [
    {
      "content": "string (the value)",
      "sourceSentenceIndices": [0],
      "confidence": 0.8,
      "category": "liberty",
      "isExplicit": false
    }
  ]
}

FIELD REQUIREMENTS:
- claimType must be one of: "factual", "causal", "evaluative", "policy"
- criticality must be one of: "low", "medium", "high", "critical"
- category must be one of: "economic", "liberty", "equality", "security", "tradition", "progress", "environment", "fairness", "efficiency", "other"
- isVerifiable, isExplicit, isConditional must be boolean (true/false)
- confidence must be a number between 0.0 and 1.0
- sourceSentenceIndices must reference sentence numbers from above

Extract all claims, assumptions, predictions, and values from the article.`;
}

// ============================================
// Transform LLM Response to Full Schema
// ============================================

function transformResponse(
  articleId: string,
  response: LLMArgumentResponse,
  model: string
): ArgumentDecompositionResult {
  return {
    articleId,
    claims: response.claims.map((c, i) => ({
      id: crypto.randomUUID(),
      content: c.content,
      sourceSentences: c.sourceSentenceIndices.map((idx) => ({
        sentenceIndex: idx,
        relevance: 'primary' as const,
      })),
      confidence: c.confidence,
      isVerifiable: c.isVerifiable,
      claimType: c.claimType,
    })),
    assumptions: response.assumptions.map((a) => ({
      id: crypto.randomUUID(),
      content: a.content,
      sourceSentences: a.sourceSentenceIndices.map((idx) => ({
        sentenceIndex: idx,
        relevance: 'primary' as const,
      })),
      confidence: a.confidence,
      isExplicit: a.isExplicit,
      criticality: a.criticality,
    })),
    predictions: response.predictions.map((p) => ({
      id: crypto.randomUUID(),
      content: p.content,
      sourceSentences: p.sourceSentenceIndices.map((idx) => ({
        sentenceIndex: idx,
        relevance: 'primary' as const,
      })),
      confidence: p.confidence,
      timeframe: p.timeframe,
      conditions: p.conditions,
      isConditional: p.isConditional,
    })),
    values: response.values.map((v) => ({
      id: crypto.randomUUID(),
      content: v.content,
      sourceSentences: v.sourceSentenceIndices.map((idx) => ({
        sentenceIndex: idx,
        relevance: 'primary' as const,
      })),
      confidence: v.confidence,
      category: v.category,
      isExplicit: v.isExplicit,
    })),
    analysisMetadata: {
      totalSentencesAnalyzed: 0, // Will be set by caller
      modelUsed: model,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================
// Main Analysis Function
// ============================================

export async function analyzeArguments(
  articleId: string,
  title: string,
  sentences: SentenceSpan[]
): Promise<{
  result: ArgumentDecompositionResult;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  prompt: string;
  rawResponse: string;
}> {
  const prompt = buildAnalysisPrompt(title, sentences);

  const llmResult = await callGeminiWithSchema(
    prompt,
    LLMArgumentResponseSchema,
    {
      systemPrompt: 'You are an expert policy analyst specializing in argument decomposition. Always respond with valid JSON.',
      temperature: 0.1,
      maxTokens: 8192,
    }
  );

  const transformedResult = transformResponse(articleId, llmResult.data, llmResult.model);
  transformedResult.analysisMetadata.totalSentencesAnalyzed = sentences.length;

  return {
    result: transformedResult,
    model: llmResult.model,
    promptTokens: llmResult.promptTokens,
    completionTokens: llmResult.completionTokens,
    prompt,
    rawResponse: llmResult.rawResponse,
  };
}
