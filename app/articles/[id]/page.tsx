'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArticleTextPanel } from '@/components/article/ArticleTextPanel';
import { ArgumentSidebar, type TabType } from '@/components/analysis/ArgumentSidebar';
import { OmissionsPanel } from '@/components/omissions/OmissionsPanel';
import { ContextCardsPanel } from '@/components/context/ContextCardsPanel';
import { PersonalImpactSection } from '@/components/impact/PersonalImpactSection';
import { ImpactBulletsList, type ImpactBulletsData } from '@/components/impact/ImpactBulletsList';
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
  const [activeArgumentTab, setActiveArgumentTab] = useState<TabType>('claims');

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDetectingOmissions, setIsDetectingOmissions] = useState(false);
  const [isExpandingContext, setIsExpandingContext] = useState(false);
  const [isExtractingParams, setIsExtractingParams] = useState(false);

  // Profile and impact state
  const [hasProfile, setHasProfile] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [impactData, setImpactData] = useState<Record<string, unknown> | null>(null);
  const [isCalculatingImpact, setIsCalculatingImpact] = useState(false);

  // Impact bullets state (new LLM-based system)
  const [impactBulletsData, setImpactBulletsData] = useState<ImpactBulletsData | null>(null);
  const [isCalculatingBullets, setIsCalculatingBullets] = useState(false);

  // Feature flag for bullet-based impact (set via environment variable)
  const useBulletImpact = process.env.NEXT_PUBLIC_USE_BULLET_IMPACT === 'true';

  // Fetch article data
  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  // Track article view for authenticated users
  useEffect(() => {
    if (data && articleId) {
      // Fire and forget - don't await
      fetch(`/api/articles/${articleId}/view`, { method: 'POST' }).catch(() => {
        // Silently ignore tracking errors
      });
    }
  }, [data, articleId]);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/users/profile');
        if (res.ok) {
          const profileData = await res.json();
          setHasProfile(true);
          setProfileId(profileData.profile.id);
        } else {
          setHasProfile(false);
          setProfileId(null);
        }
      } catch {
        setHasProfile(false);
        setProfileId(null);
      }
    };
    fetchProfile();
  }, []);

  // Fetch existing impact calculation when profile and policy params are available (old system)
  useEffect(() => {
    if (useBulletImpact) return; // Skip if using bullet system

    const fetchImpact = async () => {
      if (!profileId || !data?.policyParameters?.id) return;

      try {
        const res = await fetch(
          `/api/articles/${articleId}/impact?userProfileId=${profileId}`
        );
        if (res.ok) {
          const impactResult = await res.json();
          if (impactResult.exists) {
            setImpactData(impactResult);
          }
        }
      } catch {
        // Silently ignore - user can manually calculate
      }
    };
    fetchImpact();
  }, [profileId, data?.policyParameters?.id, articleId, useBulletImpact]);

  // Fetch existing impact bullets when profile is available (new system)
  useEffect(() => {
    if (!useBulletImpact) return; // Skip if using old system

    const fetchBullets = async () => {
      if (!profileId) return;

      try {
        const res = await fetch(
          `/api/articles/${articleId}/impact-bullets?userProfileId=${profileId}`
        );
        if (res.ok) {
          const result = await res.json();
          if (result.exists) {
            setImpactBulletsData({
              bullets: result.bullets,
              summary: result.summary,
            });
          }
        }
      } catch {
        // Silently ignore - user can manually calculate
      }
    };
    fetchBullets();
  }, [profileId, articleId, useBulletImpact]);

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

  // Calculate personal impact (old formula-based system)
  const calculateImpact = async () => {
    if (!profileId || !data?.policyParameters?.id) return;

    setIsCalculatingImpact(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfileId: profileId,
          policyParameterId: data.policyParameters.id,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setImpactData(result);
      } else {
        console.error('Impact calculation failed:', await res.text());
      }
    } catch (err) {
      console.error('Impact calculation failed:', err);
    } finally {
      setIsCalculatingImpact(false);
    }
  };

  // Calculate impact bullets (new LLM-based system)
  const calculateImpactBullets = async () => {
    if (!profileId) return;

    setIsCalculatingBullets(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/impact-bullets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfileId: profileId,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setImpactBulletsData({
          bullets: result.bullets,
          summary: result.summary,
        });
      } else {
        console.error('Impact bullets generation failed:', await res.text());
      }
    } catch (err) {
      console.error('Impact bullets generation failed:', err);
    } finally {
      setIsCalculatingBullets(false);
    }
  };

  // Handle sentence selection
  const handleSentenceSelect = (index: number) => {
    // Find elements that reference this sentence and determine type
    const claims = data?.argumentElements.claims || [];
    const assumptions = data?.argumentElements.assumptions || [];
    const predictions = data?.argumentElements.predictions || [];
    const values = data?.argumentElements.values || [];

    // Check each category to find the matching element and its type
    const matchingClaim = claims.find(e =>
      e.sourceSentences.some(s => s.sentenceIndex === index)
    );
    if (matchingClaim) {
      setSelectedElementId(matchingClaim.id);
      setActiveArgumentTab('claims');
      return;
    }

    const matchingAssumption = assumptions.find(e =>
      e.sourceSentences.some(s => s.sentenceIndex === index)
    );
    if (matchingAssumption) {
      setSelectedElementId(matchingAssumption.id);
      setActiveArgumentTab('assumptions');
      return;
    }

    const matchingPrediction = predictions.find(e =>
      e.sourceSentences.some(s => s.sentenceIndex === index)
    );
    if (matchingPrediction) {
      setSelectedElementId(matchingPrediction.id);
      setActiveArgumentTab('predictions');
      return;
    }

    const matchingValue = values.find(e =>
      e.sourceSentences.some(s => s.sentenceIndex === index)
    );
    if (matchingValue) {
      setSelectedElementId(matchingValue.id);
      setActiveArgumentTab('values');
      return;
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
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-[repeat(15,1fr)] gap-6 h-[calc(100vh-100px)]">
          {/* Article Text - columns 1-2, rows 1-9 (3/5 of height) */}
          <div className="lg:col-span-2 lg:row-start-1 lg:row-span-9 bg-white rounded-lg shadow p-6 overflow-y-auto min-h-0">
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

          {/* Personal Impact Section - columns 1-2, rows 10-15 (2/5 of height) */}
          <div className="lg:col-span-2 lg:row-start-10 lg:row-span-6 min-h-0">
            {useBulletImpact ? (
              <ImpactBulletsList
                data={impactBulletsData}
                isLoading={isCalculatingBullets}
                hasProfile={hasProfile}
                profileId={profileId || undefined}
                onCalculate={calculateImpactBullets}
              />
            ) : (
              <PersonalImpactSection
                data={impactData as any}
                isLoading={isCalculatingImpact}
                hasProfile={hasProfile}
                profileId={profileId || undefined}
                onCalculate={calculateImpact}
              />
            )}
          </div>

          {/* Argument Elements - column 3, rows 1-5 (1/3 of height) */}
          <div className="lg:col-start-3 lg:row-start-1 lg:row-span-5 bg-white rounded-lg shadow p-4 min-h-0 overflow-hidden flex flex-col">
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
                activeTab={activeArgumentTab}
                onTabChange={setActiveArgumentTab}
              />
            </div>
          </div>

          {/* Omissions - column 3, rows 6-10 (1/3 of height) */}
          <div className="lg:col-start-3 lg:row-start-6 lg:row-span-5 bg-white rounded-lg shadow p-4 min-h-0 overflow-y-auto">
            <OmissionsPanel
              omissions={data.omissions.map(o => ({
                ...o,
                type: o.type as any,
                method: o.method as any,
              }))}
              onSentenceClick={handleSentenceSelect}
            />
          </div>

          {/* Context Cards - column 3, rows 11-15 (1/3 of height) */}
          <div className="lg:col-start-3 lg:row-start-11 lg:row-span-5 bg-white rounded-lg shadow p-4 min-h-0 overflow-y-auto">
            <ContextCardsPanel contextCards={data.contextCards} />
          </div>
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
