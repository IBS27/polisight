import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { extractArticle, isValidArticleUrl } from '@/lib/services/article-extractor';
import { segmentSentences } from '@/lib/services/sentence-segmentation';
import { createTimedLogger } from '@/lib/services/provenance';
import { normalizeArticleText } from '@/lib/utils/text-normalization';

// ============================================
// Route Configuration
// ============================================

// Extend timeout to 60 seconds for article extraction (Grok needs time to fetch URLs)
export const maxDuration = 60;

// ============================================
// Request Schema
// ============================================

const CreateArticleRequestSchema = z.object({
  url: z.string().url(),
});

// ============================================
// POST /api/articles - Ingest a new article
// ============================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate request
    const parseResult = CreateArticleRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { url } = parseResult.data;

    // Validate URL format
    if (!isValidArticleUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL format. Must be HTTP or HTTPS.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if article already exists
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('id, status')
      .eq('source_url', url)
      .single();

    if (existingArticle) {
      return NextResponse.json({
        id: existingArticle.id,
        status: existingArticle.status,
        message: 'Article already exists',
        isExisting: true,
      });
    }

    // Extract article using Grok
    const extracted = await extractArticle(url);

    // Normalize article text to fix spacing issues from extraction
    const normalizedText = normalizeArticleText(extracted.text);

    // Create article record
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        source_url: url,
        title: extracted.title,
        clean_text: normalizedText,
        author: extracted.author,
        publish_date: extracted.publishDate,
        site_name: extracted.siteName,
        status: 'extracted',
        diffbot_response: extracted.rawResponse,
      })
      .select('id')
      .single();

    if (articleError || !article) {
      console.error('Failed to create article:', articleError);
      return NextResponse.json(
        { error: 'Failed to create article record' },
        { status: 500 }
      );
    }

    // Segment sentences from normalized text
    const sentences = segmentSentences(normalizedText);

    // Insert sentence spans
    const sentenceRecords = sentences.map((s) => ({
      article_id: article.id,
      sentence_index: s.sentenceIndex,
      text: s.text,
      start_char: s.startChar,
      end_char: s.endChar,
      paragraph_index: s.paragraphIndex,
    }));

    const { error: sentencesError } = await supabase
      .from('sentence_spans')
      .insert(sentenceRecords);

    if (sentencesError) {
      console.error('Failed to insert sentences:', sentencesError);
      // Don't fail the whole request, article is still created
    }

    // Log provenance
    const logger = createTimedLogger('article', article.id, article.id);
    await logger.log('created', `Article ingested from ${url}`, {
      inputData: { url },
      outputData: {
        title: extracted.title,
        sentenceCount: sentences.length,
      },
      apiProvider: 'grok',
    });

    return NextResponse.json({
      id: article.id,
      status: 'extracted',
      title: extracted.title,
      sentenceCount: sentences.length,
      isExisting: false,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Article ingestion error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Include more details for extraction errors
    const errorResponse: Record<string, unknown> = {
      error: 'Failed to ingest article',
      details: message
    };

    if (error && typeof error === 'object' && 'responseBody' in error) {
      console.error('Extraction response body:', (error as { responseBody: unknown }).responseBody);
    }

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// ============================================
// GET /api/articles - List articles
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = await createClient();

    const { data: articles, error, count } = await supabase
      .from('articles')
      .select('id, source_url, title, author, publish_date, site_name, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      articles,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('List articles error:', error);
    return NextResponse.json(
      { error: 'Failed to list articles' },
      { status: 500 }
    );
  }
}
