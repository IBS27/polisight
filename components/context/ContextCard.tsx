'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink, BookOpen } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Badge className={contextColors[contextFor]} variant="secondary">
              {contextLabels[contextFor]}
            </Badge>
            <CardTitle className="text-sm font-medium mt-2 line-clamp-2">
              {title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3">
        {/* Summary */}
        <p className={`text-sm text-gray-600 ${isExpanded ? '' : 'line-clamp-3'}`}>
          {summary}
        </p>

        {/* Expand/Collapse */}
        {summary.length > 200 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-6 px-2 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show more
              </>
            )}
          </Button>
        )}

        {/* Key Facts */}
        {keyFacts.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Key Facts
            </h4>
            <ul className="space-y-1">
              {keyFacts.map((fact, idx) => (
                <li key={idx} className="text-xs text-gray-700 flex items-start gap-1">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>
                    {fact.fact}
                    <sup className="text-blue-500 ml-0.5">
                      [{fact.citationIndex + 1}]
                    </sup>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Citations */}
        {citations.length > 0 && (
          <div className="mt-3 pt-2 border-t">
            <h4 className="text-xs font-medium text-gray-500 mb-2">Sources</h4>
            <div className="space-y-1">
              {citations.slice(0, isExpanded ? undefined : 3).map((citation, idx) => (
                <a
                  key={idx}
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <span className="text-gray-400">[{idx + 1}]</span>
                  <span className="truncate flex-1">{citation.title || citation.domain}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ))}
              {!isExpanded && citations.length > 3 && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  +{citations.length - 3} more sources
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
