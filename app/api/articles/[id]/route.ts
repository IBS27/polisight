import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================
// GET /api/articles/[id] - Get full article with all related data
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: articleId } = await params;

  try {
    const supabase = await createClient();

    // Get article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Get sentences
    const { data: sentences } = await supabase
      .from('sentence_spans')
      .select('id, sentence_index, text, start_char, end_char, paragraph_index')
      .eq('article_id', articleId)
      .order('sentence_index', { ascending: true });

    // Get argument elements grouped by type
    const { data: argumentElements } = await supabase
      .from('argument_elements')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    // Group argument elements by type
    const claims = argumentElements?.filter(e => e.element_type === 'claim') || [];
    const assumptions = argumentElements?.filter(e => e.element_type === 'assumption') || [];
    const predictions = argumentElements?.filter(e => e.element_type === 'prediction') || [];
    const values = argumentElements?.filter(e => e.element_type === 'value') || [];

    // Get omissions
    const { data: omissions } = await supabase
      .from('omissions')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    // Get context cards
    const { data: contextCards } = await supabase
      .from('context_cards')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    // Get policy parameters
    const { data: policyParams } = await supabase
      .from('policy_parameters')
      .select('*')
      .eq('article_id', articleId)
      .single();

    // Build response
    return NextResponse.json({
      article: {
        id: article.id,
        sourceUrl: article.source_url,
        title: article.title,
        author: article.author,
        publishDate: article.publish_date,
        siteName: article.site_name,
        status: article.status,
        createdAt: article.created_at,
      },
      sentences: sentences?.map(s => ({
        id: s.id,
        index: s.sentence_index,
        text: s.text,
        startChar: s.start_char,
        endChar: s.end_char,
        paragraphIndex: s.paragraph_index,
      })) || [],
      argumentElements: {
        claims: claims.map(c => ({
          id: c.id,
          content: c.content,
          claimType: c.claim_type,
          isVerifiable: c.is_verifiable,
          confidence: c.confidence,
          sourceSentences: c.source_sentences,
        })),
        assumptions: assumptions.map(a => ({
          id: a.id,
          content: a.content,
          isExplicit: a.is_explicit,
          criticality: a.criticality,
          confidence: a.confidence,
          sourceSentences: a.source_sentences,
        })),
        predictions: predictions.map(p => ({
          id: p.id,
          content: p.content,
          timeframe: p.timeframe,
          conditions: p.conditions,
          confidence: p.confidence,
          sourceSentences: p.source_sentences,
        })),
        values: values.map(v => ({
          id: v.id,
          content: v.content,
          category: v.value_category,
          isExplicit: v.is_explicit,
          confidence: v.confidence,
          sourceSentences: v.source_sentences,
        })),
      },
      omissions: omissions?.map(o => ({
        id: o.id,
        type: o.omission_type,
        method: o.detection_method,
        description: o.description,
        whyItMatters: o.why_it_matters,
        relatedSentences: o.related_sentences,
      })) || [],
      contextCards: contextCards?.map(c => ({
        id: c.id,
        contextFor: c.context_for,
        relatedElementId: c.related_element_id,
        title: c.title,
        summary: c.summary,
        keyFacts: c.key_facts,
        citations: c.citations,
      })) || [],
      policyParameters: policyParams ? {
        id: policyParams.id,
        extractionStatus: policyParams.extraction_status,
        policyType: policyParams.policy_type,
        parameters: policyParams.parameters,
        calculationFormulas: policyParams.calculation_formulas,
        reason: policyParams.reason,
        missingInformation: policyParams.missing_information,
      } : null,
      counts: {
        sentences: sentences?.length || 0,
        claims: claims.length,
        assumptions: assumptions.length,
        predictions: predictions.length,
        values: values.length,
        omissions: omissions?.length || 0,
        contextCards: contextCards?.length || 0,
      },
    });
  } catch (error) {
    console.error('Fetch article error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/articles/[id] - Delete article and all related data
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: articleId } = await params;

  try {
    const supabase = await createClient();

    // Delete article (cascades to related tables due to foreign keys)
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);

    if (error) {
      console.error('Failed to delete article:', error);
      return NextResponse.json(
        { error: 'Failed to delete article' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Article and all related data deleted',
    });
  } catch (error) {
    console.error('Delete article error:', error);
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
