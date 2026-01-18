// ============================================
// Article Extraction Service (via Grok)
// Uses xAI's Grok model through OpenRouter for real-time URL extraction
// ============================================

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Use :online suffix to enable OpenRouter's web search plugin for live URL fetching
const EXTRACTION_MODEL = 'x-ai/grok-4.1-fast:online';

// ============================================
// Extracted Article Data
// ============================================

export interface ExtractedArticle {
  title: string;
  text: string;
  html?: string;
  author?: string;
  publishDate?: string;
  siteName?: string;
  primaryImageUrl?: string;
  tags?: string[];
  rawResponse: unknown;
}

// ============================================
// Error Class
// ============================================

export class ArticleExtractorError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: unknown
  ) {
    super(message);
    this.name = 'ArticleExtractorError';
  }
}

// ============================================
// Grok Response Schema
// ============================================

interface GrokExtractionResponse {
  title: string;
  text: string;
  author?: string;
  publishDate?: string;
  siteName?: string;
  primaryImageUrl?: string;
}

// ============================================
// Main Extraction Function
// ============================================

export async function extractArticle(url: string): Promise<ExtractedArticle> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new ArticleExtractorError('OPENROUTER_API_KEY environment variable is not set');
  }

  const systemPrompt = `You are an article extraction assistant. When given a URL, fetch the article and extract its content.

Return a JSON object with these fields:
- title: The article's headline/title
- text: The complete article text, verbatim and untruncated. Include all paragraphs exactly as written.
- author: The author's name (if available)
- publishDate: The publication date in ISO format (if available)
- siteName: The name of the publication/website
- primaryImageUrl: The main article image URL (if available)

Important:
- Return the COMPLETE article text, do not summarize or truncate
- Ignore advertisements, navigation menus, sidebars, related articles, and other non-article content
- Return ONLY the JSON object, no other text`;

  const userPrompt = `Extract the article from this URL: ${url}`;

  // Use AbortController with 60 second timeout (Grok needs time to fetch and process URL)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Polisight',
      },
      body: JSON.stringify({
        model: EXTRACTION_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 16000,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ArticleExtractorError(
        `OpenRouter API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new ArticleExtractorError(
        'Grok returned no response',
        undefined,
        data
      );
    }

    const content = data.choices[0].message.content;

    // Parse JSON response
    let extracted: GrokExtractionResponse;
    try {
      // Handle potential markdown code blocks
      let jsonContent = content.trim();
      const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      }
      extracted = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse Grok response:', content);
      throw new ArticleExtractorError(
        `Failed to parse Grok response as JSON: ${parseError}`,
        undefined,
        content
      );
    }

    // Validate required fields
    if (!extracted.title || !extracted.text) {
      throw new ArticleExtractorError(
        'Grok could not extract article content. The URL may be inaccessible or not contain article content.',
        undefined,
        extracted
      );
    }

    return {
      title: extracted.title,
      text: extracted.text,
      html: undefined, // Grok returns plain text
      author: extracted.author,
      publishDate: extracted.publishDate,
      siteName: extracted.siteName,
      primaryImageUrl: extracted.primaryImageUrl,
      tags: undefined, // Grok doesn't extract tags
      rawResponse: { grokResponse: extracted, openRouterMeta: data },
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ArticleExtractorError) throw error;

    // Handle abort/timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ArticleExtractorError(
        'Article extraction timed out. The URL may be slow to respond or inaccessible.',
        408,
        { url, timeout: 60000 }
      );
    }

    throw new ArticleExtractorError(
      `Failed to extract article: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      { url, error: String(error) }
    );
  }
}

// Helper to check if URL is valid for extraction
export function isValidArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
