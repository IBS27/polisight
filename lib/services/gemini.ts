import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================
// OpenRouter Configuration
// ============================================

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

// ============================================
// OpenRouter Response Types
// ============================================

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================
// Error Handling
// ============================================

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: unknown
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

// ============================================
// Call Result Type
// ============================================

export interface LLMCallResult<T> {
  data: T;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  rawResponse: string;
}

// ============================================
// Main Function: Call with Schema Validation
// ============================================

export async function callGeminiWithSchema<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<LLMCallResult<T>> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY environment variable is not set');
  }

  const model = options?.model || DEFAULT_MODEL;

  // Convert Zod schema to JSON Schema
  // Note: Using type assertion due to Zod v4 type changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = zodToJsonSchema(schema as any, {
    $refStrategy: 'none',
    target: 'openApi3',
  });

  // Build system prompt that enforces JSON output
  const jsonSchemaStr = JSON.stringify(jsonSchema, null, 2);
  const systemPrompt = options?.systemPrompt
    ? `${options.systemPrompt}\n\nYou MUST respond with valid JSON only. No markdown, no explanation, just the JSON object.`
    : 'You are a helpful assistant that always responds with valid JSON. No markdown code blocks, no explanation, just the raw JSON object.';

  // Build messages array
  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `${prompt}\n\nRespond with a JSON object matching this schema:\n${jsonSchemaStr}\n\nReturn ONLY the JSON object, no other text.`,
    },
  ];

  // Make API request
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'PoliSight',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 4096,
      response_format: {
        type: 'json_object',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new OpenRouterError(
      `OpenRouter API request failed: ${response.status} ${response.statusText}`,
      response.status,
      body
    );
  }

  const rawData: OpenRouterResponse = await response.json();

  if (!rawData.choices || rawData.choices.length === 0) {
    throw new OpenRouterError(
      'OpenRouter returned no choices',
      undefined,
      rawData
    );
  }

  const content = rawData.choices[0].message.content;

  // Extract JSON from potential markdown code blocks
  let jsonContent = content.trim();

  // Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
  const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonContent = codeBlockMatch[1].trim();
  }

  // Parse JSON response
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonContent);
  } catch (parseError) {
    console.error('Failed to parse LLM response. Raw content:', content);
    throw new OpenRouterError(
      `Failed to parse LLM response as JSON: ${parseError}`,
      undefined,
      content
    );
  }

  // Validate against Zod schema
  const validationResult = schema.safeParse(parsedJson);

  if (!validationResult.success) {
    console.error('LLM response validation failed. Parsed JSON type:', typeof parsedJson);
    console.error('Parsed JSON value:', JSON.stringify(parsedJson, null, 2)?.slice(0, 1000));
    throw new OpenRouterError(
      `LLM response failed schema validation: ${validationResult.error.message}`,
      undefined,
      { parsedJson, zodError: validationResult.error }
    );
  }

  return {
    data: validationResult.data,
    model: rawData.model,
    promptTokens: rawData.usage?.prompt_tokens,
    completionTokens: rawData.usage?.completion_tokens,
    rawResponse: content,
  };
}

// ============================================
// Simple Call (without schema validation)
// ============================================

export async function callGemini(
  prompt: string,
  options?: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{
  content: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY environment variable is not set');
  }

  const model = options?.model || DEFAULT_MODEL;

  const messages: OpenRouterMessage[] = [];

  if (options?.systemPrompt) {
    messages.push({
      role: 'system',
      content: options.systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'PoliSight',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new OpenRouterError(
      `OpenRouter API request failed: ${response.status} ${response.statusText}`,
      response.status,
      body
    );
  }

  const rawData: OpenRouterResponse = await response.json();

  if (!rawData.choices || rawData.choices.length === 0) {
    throw new OpenRouterError(
      'OpenRouter returned no choices',
      undefined,
      rawData
    );
  }

  return {
    content: rawData.choices[0].message.content,
    model: rawData.model,
    promptTokens: rawData.usage?.prompt_tokens,
    completionTokens: rawData.usage?.completion_tokens,
  };
}
