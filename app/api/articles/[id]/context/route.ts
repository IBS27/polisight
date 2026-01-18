import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchWithCitations, generateContextQuery } from '@/lib/services/perplexity';
import { createTimedLogger } from '@/lib/services/provenance';

// ============================================
// POST /api/articles/[id]/context - Expand context
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

    // Get argument elements (claims and assumptions to expand)
    const { data: argumentElements } = await supabase
      .from('argument_elements')
      .select('id, element_type, content')
      .eq('article_id', articleId)
      .in('element_type', ['claim', 'assumption'])
      .order('created_at', { ascending: true })
      .limit(5); // Limit to top 5 for context expansion

    // Get omissions
    const { data: omissions } = await supabase
      .from('omissions')
      .select('id, omission_type, description')
      .eq('article_id', articleId)
      .limit(3); // Limit to top 3

    const contextCards: Array<{
      contextFor: string;
      relatedElementId?: string;
      title: string;
      summary: string;
      keyFacts: Array<{ fact: string; citationIndex: number }>;
      citations: Array<{ url: string; title: string; domain: string; snippet?: string }>;
    }> = [];

    // Note: We'll use atomic replace at the end instead of deleting here

    // Expand context for claims
    if (argumentElements && argumentElements.length > 0) {
      for (const element of argumentElements) {
        const elementType = element.element_type as 'claim' | 'assumption';
        const query = generateContextQuery(elementType, element.content, article.title);

        try {
          const contextData = await searchWithCitations(query);

          // Extract key facts from the content (simple extraction)
          const sentences = contextData.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
          const keyFacts = sentences.slice(0, 3).map((fact, idx) => ({
            fact: fact.trim(),
            citationIndex: Math.min(idx, contextData.citations.length - 1),
          }));

          const card = {
            contextFor: elementType,
            relatedElementId: element.id,
            title: element.content,
            summary: contextData.content,
            keyFacts,
            citations: contextData.citations.map(c => ({
              url: c.url,
              title: c.title,
              domain: c.domain,
              snippet: c.snippet,
            })),
          };

          contextCards.push(card);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to expand context for element ${element.id}:`, error);
        }
      }
    }

    // Expand context for omissions
    if (omissions && omissions.length > 0) {
      for (const omission of omissions) {
        const query = generateContextQuery('omission', omission.description, article.title);

        try {
          const contextData = await searchWithCitations(query);

          const sentences = contextData.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
          const keyFacts = sentences.slice(0, 3).map((fact, idx) => ({
            fact: fact.trim(),
            citationIndex: Math.min(idx, contextData.citations.length - 1),
          }));

          const card = {
            contextFor: 'omission',
            relatedElementId: omission.id,
            title: omission.omission_type,
            summary: contextData.content,
            keyFacts,
            citations: contextData.citations.map(c => ({
              url: c.url,
              title: c.title,
              domain: c.domain,
              snippet: c.snippet,
            })),
          };

          contextCards.push(card);

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to expand context for omission ${omission.id}:`, error);
        }
      }
    }

    // Insert context cards
    if (contextCards.length > 0) {
      const cardRecords = contextCards.map(card => ({
        article_id: articleId,
        context_for: card.contextFor,
        related_element_id: card.relatedElementId,
        title: card.title,
        summary: card.summary,
        key_facts: card.keyFacts,
        citations: card.citations,
      }));

      const { error: insertError } = await supabase
        .from('context_cards')
        .insert(cardRecords);

      if (insertError) {
        console.error('Failed to insert context cards:', insertError);
      }
    }

    // Log provenance
    const logger = createTimedLogger('article', articleId, articleId);
    await logger.log('analyzed', 'Context expansion completed', {
      inputData: {
        elementCount: argumentElements?.length || 0,
        omissionCount: omissions?.length || 0,
      },
      outputData: {
        contextCardCount: contextCards.length,
        totalCitations: contextCards.reduce((sum, c) => sum + c.citations.length, 0),
      },
      apiProvider: 'perplexity',
    });

    return NextResponse.json({
      articleId,
      contextCards: contextCards.map(c => ({
        contextFor: c.contextFor,
        title: c.title,
        summary: c.summary,
        keyFactCount: c.keyFacts.length,
        citationCount: c.citations.length,
      })),
      count: contextCards.length,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Context expansion error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to expand context', details: message },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/articles/[id]/context - Get context cards
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: articleId } = await params;

  try {
    const supabase = await createClient();

    const { data: contextCards, error } = await supabase
      .from('context_cards')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch context cards:', error);
      return NextResponse.json(
        { error: 'Failed to fetch context cards' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      articleId,
      contextCards: contextCards?.map(c => ({
        id: c.id,
        contextFor: c.context_for,
        relatedElementId: c.related_element_id,
        title: c.title,
        summary: c.summary,
        keyFacts: c.key_facts,
        citations: c.citations,
      })) || [],
      count: contextCards?.length || 0,
    });
  } catch (error) {
    console.error('Fetch context cards error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch context cards' },
      { status: 500 }
    );
  }
}
