'use client';

import { useState, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ExternalLink, BookOpen, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface Citation {
  url: string;
  title: string;
  domain: string;
  snippet?: string;
}

interface KeyFact {
  fact: string;
  citationIndex: number;
}

interface ContextCardProps {
  id: string;
  contextFor: 'claim' | 'assumption' | 'omission' | 'general';
  title: string;
  summary: string;
  keyFacts: KeyFact[];
  citations: Citation[];
}

interface ParsedContent {
  verdict: string | null;
  keyData: string[];
  perspectives: { supporting: string | null; opposing: string | null };
  hasStructuredFormat: boolean;
}

// ============================================
// Helper: Parse Structured Content
// ============================================

function parseStructuredContent(summary: string): ParsedContent {
  const result: ParsedContent = {
    verdict: null,
    keyData: [],
    perspectives: { supporting: null, opposing: null },
    hasStructuredFormat: false,
  };

  // Extract verdict
  const verdictMatch = summary.match(/\*\*Verdict:\*\*\s*(.+?)(?=\n|$)/);
  if (verdictMatch) {
    result.verdict = verdictMatch[1].trim();
    result.hasStructuredFormat = true;
  }

  // Extract key data bullets
  const keyDataMatch = summary.match(/\*\*Key Data:\*\*\n([\s\S]*?)(?=\n\*\*|$)/);
  if (keyDataMatch) {
    const bullets = keyDataMatch[1].match(/[•\-]\s*(.+)/g) || [];
    result.keyData = bullets.map(b => b.replace(/^[•\-]\s*/, '').trim());
    result.hasStructuredFormat = true;
  }

  // Extract perspectives
  const perspectivesMatch = summary.match(/\*\*Perspectives:\*\*\n([\s\S]*?)(?=\n\*\*|$)/);
  if (perspectivesMatch) {
    const supportingMatch = perspectivesMatch[1].match(/[•\-]\s*Supporting:\s*(.+)/);
    const opposingMatch = perspectivesMatch[1].match(/[•\-]\s*Opposing:\s*(.+)/);
    if (supportingMatch) result.perspectives.supporting = supportingMatch[1].trim();
    if (opposingMatch) result.perspectives.opposing = opposingMatch[1].trim();
    result.hasStructuredFormat = true;
  }

  return result;
}

// ============================================
// Context Type Labels
// ============================================

const contextLabels = {
  claim: 'Claim Context',
  assumption: 'Assumption Context',
  omission: 'Missing Context',
  general: 'Background',
};

const contextColors = {
  claim: 'bg-blue-100 text-blue-700',
  assumption: 'bg-amber-100 text-amber-700',
  omission: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-700',
};

// ============================================
// Component
// ============================================

export function ContextCard({
  id,
  contextFor,
  title,
  summary,
  keyFacts,
  citations,
}: ContextCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);

  // Parse structured content from summary
  const parsed = useMemo(() => parseStructuredContent(summary), [summary]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-white overflow-hidden">
        {/* Collapsed header - always visible */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
            <Badge className={cn(contextColors[contextFor], 'text-xs shrink-0')} variant="secondary">
              {contextLabels[contextFor]}
            </Badge>
            <span className={cn(
              'text-sm text-gray-800 flex-1 min-w-0',
              isOpen ? 'whitespace-normal' : 'truncate'
            )}>
              {title}
            </span>
            <ChevronDown className={cn(
              'w-4 h-4 text-gray-400 transition-transform shrink-0',
              isOpen && 'rotate-180'
            )} />
          </button>
        </CollapsibleTrigger>

        {/* Expandable content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 border-t border-gray-100 space-y-2">
            {/* Verdict - prominent display */}
            {parsed.verdict && (
              <p className="text-sm font-medium text-gray-800 pt-2 pb-1 border-b border-gray-50">
                {parsed.verdict}
              </p>
            )}

            {/* Key Data - primary content when structured */}
            {parsed.hasStructuredFormat && parsed.keyData.length > 0 ? (
              <div className="text-xs pt-1">
                <h4 className="font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Key Data
                </h4>
                <ul className="space-y-0.5 pl-1">
                  {parsed.keyData.map((data, idx) => (
                    <li key={idx} className="text-gray-600 flex items-start gap-1">
                      <span className="text-gray-400">•</span>
                      <span>{data}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              /* Fall back to keyFacts if no structured format */
              keyFacts.length > 0 && (
                <div className="text-xs pt-1">
                  <h4 className="font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    Key Facts
                  </h4>
                  <ul className="space-y-0.5 pl-1">
                    {keyFacts.map((fact, idx) => (
                      <li key={idx} className="text-gray-600 flex items-start gap-1">
                        <span className="text-gray-400">•</span>
                        <span>
                          {fact.fact}
                          <sup className="text-blue-500 ml-0.5">[{fact.citationIndex + 1}]</sup>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}

            {/* Perspectives - compact display */}
            {(parsed.perspectives.supporting || parsed.perspectives.opposing) && (
              <div className="text-xs pt-1">
                <h4 className="font-medium text-gray-500 mb-1">Perspectives</h4>
                <div className="space-y-0.5 pl-1">
                  {parsed.perspectives.supporting && (
                    <p className="text-gray-600">
                      <span className="text-green-600 font-medium">Supporting:</span> {parsed.perspectives.supporting}
                    </p>
                  )}
                  {parsed.perspectives.opposing && (
                    <p className="text-gray-600">
                      <span className="text-red-600 font-medium">Opposing:</span> {parsed.perspectives.opposing}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Show details toggle - only for structured content */}
            {parsed.hasStructuredFormat && (
              <button
                onClick={() => setShowFullSummary(!showFullSummary)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-0.5 pt-1"
              >
                <ChevronRight className={cn('w-3 h-3 transition-transform', showFullSummary && 'rotate-90')} />
                {showFullSummary ? 'Hide details' : 'Show details'}
              </button>
            )}

            {/* Full summary - hidden by default for structured content */}
            {(!parsed.hasStructuredFormat || showFullSummary) && !parsed.verdict && (
              <p className="text-sm text-gray-600 pt-2">{summary}</p>
            )}
            {parsed.hasStructuredFormat && showFullSummary && (
              <p className="text-xs text-gray-500 pt-1 pl-2 border-l-2 border-gray-200 whitespace-pre-wrap">{summary}</p>
            )}

            {/* Sources - compact inline */}
            {citations.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <h4 className="text-xs font-medium text-gray-500 mb-1">Sources</h4>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {citations.map((citation, idx) => (
                    <a
                      key={idx}
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline"
                    >
                      <span className="text-gray-400">[{idx + 1}]</span>
                      <span>{citation.domain}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
