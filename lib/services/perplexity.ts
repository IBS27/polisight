// ============================================
// Perplexity API Configuration (via OpenRouter)
// ============================================

// Use OpenRouter as the provider for Perplexity models
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'perplexity/sonar-pro';

// ============================================
// Response Types
// ============================================

interface PerplexityMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface PerplexitySearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface PerplexityChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: PerplexityChoice[];
  citations?: string[];
  search_results?: PerplexitySearchResult[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================
// Context Data Types
// ============================================

export interface ContextCitation {
  url: string;
  title: string;
  domain: string;
  snippet?: string;
}

export interface ContextData {
  content: string;
  citations: ContextCitation[];
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

// ============================================
// Error Handling
// ============================================

export class PerplexityError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: unknown
  ) {
    super(message);
    this.name = 'PerplexityError';
  }
}

// ============================================
// Helper: Extract domain from URL
// ============================================

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ============================================
// Main Function: Search with Citations
// ============================================

export async function searchWithCitations(
  query: string,
  options?: {
    model?: string;
    systemPrompt?: string;
    returnImages?: boolean;
    returnRelatedQuestions?: boolean;
  }
): Promise<ContextData> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new PerplexityError('OPENROUTER_API_KEY environment variable is not set');
  }

  const model = options?.model || DEFAULT_MODEL;

  const systemPrompt = options?.systemPrompt ||
    `You are a neutral, factual research assistant. Provide balanced, well-sourced information about policy topics.
     Focus on:
     - Historical context and precedents
     - Multiple perspectives on the issue
     - Factual data and statistics from reliable sources
     - Potential impacts on different groups
     Avoid taking political positions or making value judgments.`;

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query },
  ];

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Polisight',
    },
    body: JSON.stringify({
      model,
      messages,
      // OpenRouter passes these through to Perplexity
      return_citations: true,
      return_images: options?.returnImages ?? false,
      return_related_questions: options?.returnRelatedQuestions ?? false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new PerplexityError(
      `Perplexity API request failed: ${response.status} ${response.statusText}`,
      response.status,
      body
    );
  }

  const data: PerplexityResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new PerplexityError(
      'Perplexity returned no choices',
      undefined,
      data
    );
  }

  const content = data.choices[0].message.content;

  // Build citations from both citations array and search_results
  const citations: ContextCitation[] = [];

  // Add citations from the citations array (these are URLs)
  if (data.citations) {
    for (const url of data.citations) {
      // Try to find matching search result for title
      const matchingResult = data.search_results?.find(r => r.url === url);

      citations.push({
        url,
        title: matchingResult?.title || extractDomain(url),
        domain: extractDomain(url),
        snippet: matchingResult?.snippet,
      });
    }
  }

  // Add any search results not already in citations
  if (data.search_results) {
    for (const result of data.search_results) {
      if (!citations.some(c => c.url === result.url)) {
        citations.push({
          url: result.url,
          title: result.title,
          domain: extractDomain(result.url),
          snippet: result.snippet,
        });
      }
    }
  }

  return {
    content,
    citations,
    model: data.model,
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
  };
}

// ============================================
// Generate Context Search Query
// ============================================

export function generateContextQuery(
  elementType: 'claim' | 'assumption' | 'omission',
  elementContent: string,
  articleTitle?: string
): string {
  const baseContext = articleTitle ? ` (related to: ${articleTitle})` : '';

  switch (elementType) {
    case 'claim':
      return `What is the factual background and evidence regarding: "${elementContent}"${baseContext}? Include relevant statistics, historical context, and expert perspectives.`;

    case 'assumption':
      return `What evidence supports or contradicts this assumption: "${elementContent}"${baseContext}? Include relevant research, data, and different viewpoints.`;

    case 'omission':
      return `Provide balanced information about: "${elementContent}"${baseContext}. Include multiple perspectives, relevant data, and potential implications.`;

    default:
      return `Provide factual background on: "${elementContent}"${baseContext}`;
  }
}

// ============================================
// Batch Context Expansion
// ============================================

export async function expandContextBatch(
  queries: Array<{
    id: string;
    elementType: 'claim' | 'assumption' | 'omission';
    content: string;
    articleTitle?: string;
  }>,
  options?: {
    concurrency?: number;
    delayMs?: number;
  }
): Promise<Map<string, ContextData>> {
  const results = new Map<string, ContextData>();
  const concurrency = options?.concurrency ?? 2;
  const delayMs = options?.delayMs ?? 500;

  // Process in batches
  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);

    const batchPromises = batch.map(async (query) => {
      const searchQuery = generateContextQuery(
        query.elementType,
        query.content,
        query.articleTitle
      );

      try {
        const result = await searchWithCitations(searchQuery);
        return { id: query.id, result, error: null };
      } catch (error) {
        return { id: query.id, result: null, error };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const { id, result, error } of batchResults) {
      if (result) {
        results.set(id, result);
      } else {
        console.error(`Failed to expand context for ${id}:`, error);
      }
    }

    // Delay between batches to avoid rate limiting
    if (i + concurrency < queries.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
