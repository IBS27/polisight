import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeArguments } from '@/lib/services/argument-analysis';
import { createTimedLogger } from '@/lib/services/provenance';

// ============================================
// POST /api/articles/[id]/analyze - Run argument analysis
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
      .select('id, title, clean_text, status')
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

    // Update status to analyzing
    await supabase
      .from('articles')
      .update({ status: 'analyzing' })
      .eq('id', articleId);

    // Run analysis
    const sentenceSpans = sentences.map((s) => ({
      text: s.text,
      startChar: s.start_char,
      endChar: s.end_char,
      paragraphIndex: s.paragraph_index || 0,
      sentenceIndex: s.sentence_index,
    }));

    const analysis = await analyzeArguments(articleId, article.title, sentenceSpans);

    // Store argument elements
    const argumentRecords = [
      ...analysis.result.claims.map((c) => ({
        article_id: articleId,
        element_type: 'claim' as const,
        content: c.content,
        claim_type: c.claimType,
        is_verifiable: c.isVerifiable,
        confidence: c.confidence,
        source_sentences: c.sourceSentences,
      })),
      ...analysis.result.assumptions.map((a) => ({
        article_id: articleId,
        element_type: 'assumption' as const,
        content: a.content,
        is_explicit: a.isExplicit,
        criticality: a.criticality,
        confidence: a.confidence,
        source_sentences: a.sourceSentences,
      })),
      ...analysis.result.predictions.map((p) => ({
        article_id: articleId,
        element_type: 'prediction' as const,
        content: p.content,
        timeframe: p.timeframe,
        conditions: p.conditions,
        confidence: p.confidence,
        source_sentences: p.sourceSentences,
      })),
      ...analysis.result.values.map((v) => ({
        article_id: articleId,
        element_type: 'value' as const,
        content: v.content,
        value_category: v.category,
        is_explicit: v.isExplicit,
        confidence: v.confidence,
        source_sentences: v.sourceSentences,
      })),
    ];

    // Use atomic replace function to prevent data loss on insert failure
    const { error: replaceError } = await supabase.rpc('replace_argument_elements', {
      p_article_id: articleId,
      p_elements: argumentRecords,
    });

    if (replaceError) {
      console.error('Failed to replace argument elements:', replaceError);
      return NextResponse.json(
        { error: 'Failed to store analysis results' },
        { status: 500 }
      );
    }

    // Update status to analyzed
    await supabase
      .from('articles')
      .update({ status: 'analyzed' })
      .eq('id', articleId);

    // Log provenance
    const logger = createTimedLogger('article', articleId, articleId);
    await logger.log('analyzed', 'Argument analysis completed', {
      inputData: {
        sentenceCount: sentences.length,
      },
      outputData: {
        claimCount: analysis.result.claims.length,
        assumptionCount: analysis.result.assumptions.length,
        predictionCount: analysis.result.predictions.length,
        valueCount: analysis.result.values.length,
      },
      llmModel: analysis.model,
      llmPrompt: analysis.prompt,
      llmResponse: analysis.rawResponse,
      apiProvider: 'openrouter',
    });

    return NextResponse.json({
      articleId,
      status: 'analyzed',
      counts: {
        claims: analysis.result.claims.length,
        assumptions: analysis.result.assumptions.length,
        predictions: analysis.result.predictions.length,
        values: analysis.result.values.length,
      },
      tokens: {
        prompt: analysis.promptTokens,
        completion: analysis.completionTokens,
      },
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Argument analysis error:', error);

    // Update status to error
    const supabase = await createClient();
    await supabase
      .from('articles')
      .update({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', articleId);

    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to analyze article', details: message },
      { status: 500 }
    );
  }
}
