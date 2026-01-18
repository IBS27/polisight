import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectOmissionsWithLLM } from '@/lib/services/omission-detection';
import { createTimedLogger } from '@/lib/services/provenance';

// ============================================
// POST /api/articles/[id]/omissions - Detect omissions
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id: articleId } = await params;

  try {
    const supabase = await createClient();

    // Get article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, title')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Get sentences
    const { data: sentences, error: sentencesError } = await supabase
      .from('sentence_spans')
      .select('*')
      .eq('article_id', articleId)
      .order('sentence_index', { ascending: true });

    if (sentencesError || !sentences || sentences.length === 0) {
      return NextResponse.json(
        { error: 'No sentences found for article' },
        { status: 400 }
      );
    }

    // Convert to SentenceSpan format
    const sentenceSpans = sentences.map((s) => ({
      text: s.text,
      startChar: s.start_char,
      endChar: s.end_char,
      paragraphIndex: s.paragraph_index || 0,
      sentenceIndex: s.sentence_index,
    }));

    // Run LLM-based omission detection
    const result = await detectOmissionsWithLLM(sentenceSpans, article.title);
    const { omissions: detections, model, promptTokens, completionTokens } = result;

    // Delete existing omissions for this article (in case of re-detection)
    await supabase
      .from('omissions')
      .delete()
      .eq('article_id', articleId);

    // Insert omissions
    if (detections.length > 0) {
      const omissionRecords = detections.map(d => ({
        article_id: articleId,
        omission_type: d.omissionType,
        detection_method: d.detectionMethod,
        description: d.description,
        why_it_matters: d.whyItMatters,
      }));

      const { error: insertError } = await supabase
        .from('omissions')
        .insert(omissionRecords);

      if (insertError) {
        console.error('Failed to insert omissions:', insertError);
        return NextResponse.json(
          { error: 'Failed to store omission results' },
          { status: 500 }
        );
      }
    }

    // Log provenance
    const logger = createTimedLogger('article', articleId, articleId);
    await logger.log('analyzed', 'LLM-based omission detection completed', {
      inputData: {
        sentenceCount: sentences.length,
      },
      outputData: {
        omissionCount: detections.length,
        omissionTypes: detections.map(d => d.omissionType),
        model,
        promptTokens,
        completionTokens,
      },
      apiProvider: 'openrouter',
    });

    return NextResponse.json({
      articleId,
      omissions: detections.map(d => ({
        type: d.omissionType,
        method: d.detectionMethod,
        description: d.description,
        whyItMatters: d.whyItMatters,
      })),
      count: detections.length,
      model,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Omission detection error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to detect omissions', details: message },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/articles/[id]/omissions - Get omissions
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: articleId } = await params;

  try {
    const supabase = await createClient();

    const { data: omissions, error } = await supabase
      .from('omissions')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch omissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch omissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      articleId,
      omissions: omissions?.map(o => ({
        id: o.id,
        type: o.omission_type,
        method: o.detection_method,
        description: o.description,
        whyItMatters: o.why_it_matters,
      })) || [],
      count: omissions?.length || 0,
    });
  } catch (error) {
    console.error('Fetch omissions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch omissions' },
      { status: 500 }
    );
  }
}
