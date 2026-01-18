'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArticleTextPanel } from '@/components/article/ArticleTextPanel';
import { ArgumentSidebar } from '@/components/analysis/ArgumentSidebar';
import { OmissionsPanel } from '@/components/omissions/OmissionsPanel';
import { ContextCardsPanel } from '@/components/context/ContextCardsPanel';
import { PersonalImpactSection } from '@/components/impact/PersonalImpactSection';
import { ProvenanceDrawer } from '@/components/provenance/ProvenanceDrawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Play,
  History,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface ArticleData {
  article: {
    id: string;
    sourceUrl: string;
    title: string;
    author?: string;
    publishDate?: string;
    siteName?: string;
    status: string;
  };
  sentences: Array<{
    id: string;
    index: number;
    text: string;
    paragraphIndex: number;
  }>;
  argumentElements: {
    claims: Array<{
      id: string;
      content: string;
      claimType: string;
      isVerifiable: boolean;
      confidence: number;
      sourceSentences: Array<{ sentenceIndex: number }>;
    }>;
    assumptions: Array<{
      id: string;
      content: string;
      isExplicit: boolean;
      criticality: string;
      confidence: number;
      sourceSentences: Array<{ sentenceIndex: number }>;
    }>;
    predictions: Array<{
      id: string;
      content: string;
      timeframe?: string;
      conditions?: string;
      confidence: number;
      sourceSentences: Array<{ sentenceIndex: number }>;
    }>;
    values: Array<{
      id: string;
      content: string;
      category: string;
      isExplicit: boolean;
      confidence: number;
      sourceSentences: Array<{ sentenceIndex: number }>;
    }>;
  };
  omissions: Array<{
    id: string;
    type: string;
    method: string;
    description: string;
    whyItMatters?: string;
    relatedSentences?: Array<{ sentenceIndex: number }>;
  }>;
  contextCards: Array<{
    id: string;
    contextFor: 'claim' | 'assumption' | 'omission' | 'general';
    title: string;
    summary: string;
    keyFacts: Array<{ fact: string; citationIndex: number }>;
    citations: Array<{ url: string; title: string; domain: string; snippet?: string }>;
  }>;
  policyParameters: {
    id: string;
    extractionStatus: string;
    policyType?: string;
  } | null;
  counts: {
    sentences: number;
    claims: number;
    assumptions: number;
    predictions: number;
    values: number;
    omissions: number;
    contextCards: number;
  };
}

// ============================================
// Page Component
// ============================================

export default function ArticleAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const articleId = resolvedParams.id;

  const [data, setData] = useState<ArticleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  const [showProvenance, setShowProvenance] = useState(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDetectingOmissions, setIsDetectingOmissions] = useState(false);
  const [isExpandingContext, setIsExpandingContext] = useState(false);
  const [isExtractingParams, setIsExtractingParams] = useState(false);

  // Fetch article data
  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  const fetchArticle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/articles/${articleId}`);
      if (!res.ok) {
        throw new Error('Article not found');
      }
      const articleData = await res.json();
      setData(articleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article');
    } finally {
      setIsLoading(false);
    }
  };

  // Run analysis
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await fetch(`/api/articles/${articleId}/analyze`, { method: 'POST' });
      await fetchArticle();
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Detect omissions
  const detectOmissions = async () => {
    setIsDetectingOmissions(true);
    try {
      await fetch(`/api/articles/${articleId}/omissions`, { method: 'POST' });
      await fetchArticle();
    } catch (err) {
      console.error('Omission detection failed:', err);
    } finally {
      setIsDetectingOmissions(false);
    }
  };

  // Expand context
  const expandContext = async () => {
    setIsExpandingContext(true);
    try {
      await fetch(`/api/articles/${articleId}/context`, { method: 'POST' });
      await fetchArticle();
    } catch (err) {
      console.error('Context expansion failed:', err);
    } finally {
      setIsExpandingContext(false);
    }
  };

  // Extract policy parameters
  const extractParams = async () => {
    setIsExtractingParams(true);
    try {
      await fetch(`/api/articles/${articleId}/parameters`, { method: 'POST' });
      await fetchArticle();
    } catch (err) {
      console.error('Parameter extraction failed:', err);
    } finally {
      setIsExtractingParams(false);
    }
  };

  // Handle sentence selection
  const handleSentenceSelect = (index: number) => {
    // Find elements that reference this sentence
    const allElements = [
      ...data?.argumentElements.claims || [],
      ...data?.argumentElements.assumptions || [],
      ...data?.argumentElements.predictions || [],
      ...data?.argumentElements.values || [],
    ];

    const matchingElement = allElements.find(e =>
      e.sourceSentences.some(s => s.sentenceIndex === index)
    );

    if (matchingElement) {
      setSelectedElementId(matchingElement.id);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Article not found'}
          </h1>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasAnalysis = data.counts.claims > 0 || data.counts.assumptions > 0;

  // Build argument elements for ArticleTextPanel
  const argumentElementsForPanel = [
    ...data.argumentElements.claims.map(c => ({
      id: c.id,
      type: 'claim' as const,
      sourceSentences: c.sourceSentences,
    })),
    ...data.argumentElements.assumptions.map(a => ({
      id: a.id,
      type: 'assumption' as const,
      sourceSentences: a.sourceSentences,
    })),
    ...data.argumentElements.predictions.map(p => ({
      id: p.id,
      type: 'prediction' as const,
      sourceSentences: p.sourceSentences,
    })),
    ...data.argumentElements.values.map(v => ({
      id: v.id,
      type: 'value' as const,
      sourceSentences: v.sourceSentences,
    })),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold text-gray-900 truncate max-w-md">
                  {data.article.title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Badge
                    variant={data.article.status === 'analyzed' ? 'default' : 'secondary'}
                  >
                    {data.article.status}
                  </Badge>
                  <a
                    href={data.article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    View original <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProvenance(true)}
              >
                <History className="w-4 h-4 mr-2" />
                Audit Trail
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Analysis Actions */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              size="sm"
              onClick={runAnalysis}
              disabled={isAnalyzing}
              variant={hasAnalysis ? 'outline' : 'default'}
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : hasAnalysis ? (
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {hasAnalysis ? 'Re-analyze' : 'Analyze Arguments'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={detectOmissions}
              disabled={isDetectingOmissions || !hasAnalysis}
            >
              {isDetectingOmissions ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : data.counts.omissions > 0 ? (
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Detect Omissions
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={expandContext}
              disabled={isExpandingContext || !hasAnalysis}
            >
              {isExpandingContext ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : data.counts.contextCards > 0 ? (
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Expand Context
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={extractParams}
              disabled={isExtractingParams || !hasAnalysis}
            >
              {isExtractingParams ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : data.policyParameters ? (
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Extract Policy Params
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Article Text - Left Column */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 max-h-[calc(100vh-220px)] overflow-y-auto">
            <ArticleTextPanel
              title={data.article.title}
              author={data.article.author}
              publishDate={data.article.publishDate}
              siteName={data.article.siteName}
              sentences={data.sentences}
              argumentElements={argumentElementsForPanel}
              selectedElementId={selectedElementId}
              onSentenceSelect={handleSentenceSelect}
              onElementHighlight={setHighlightedElementId}
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Argument Elements */}
            <div className="bg-white rounded-lg shadow p-4 max-h-80 overflow-hidden flex flex-col">
              <h2 className="font-semibold text-gray-900 mb-3">
                Argument Elements ({data.counts.claims + data.counts.assumptions + data.counts.predictions + data.counts.values})
              </h2>
              <div className="flex-1 overflow-y-auto">
                <ArgumentSidebar
                  claims={data.argumentElements.claims}
                  assumptions={data.argumentElements.assumptions}
                  predictions={data.argumentElements.predictions}
                  values={data.argumentElements.values}
                  selectedElementId={selectedElementId}
                  highlightedElementId={highlightedElementId}
                  onElementSelect={setSelectedElementId}
                />
              </div>
            </div>

            {/* Omissions */}
            <div className="bg-white rounded-lg shadow p-4 max-h-64 overflow-y-auto">
              <OmissionsPanel
                omissions={data.omissions.map(o => ({
                  ...o,
                  type: o.type as any,
                  method: o.method as any,
                }))}
                onSentenceClick={handleSentenceSelect}
              />
            </div>

            {/* Context Cards */}
            <div className="bg-white rounded-lg shadow p-4 max-h-80 overflow-y-auto">
              <ContextCardsPanel contextCards={data.contextCards} />
            </div>
          </div>
        </div>

        {/* Personal Impact Section - Always Visible */}
        <div className="mt-6">
          <PersonalImpactSection
            data={null}
            hasProfile={false}
            onCalculate={undefined}
          />
        </div>
      </div>

      {/* Provenance Drawer */}
      <ProvenanceDrawer
        isOpen={showProvenance}
        onClose={() => setShowProvenance(false)}
        articleId={articleId}
      />
    </div>
  );
}
