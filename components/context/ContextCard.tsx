'use client';

import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ExternalLink, BookOpen } from 'lucide-react';
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
            {/* Summary */}
            <p className="text-sm text-gray-600 pt-2">{summary}</p>

            {/* Key Facts - compact */}
            {keyFacts.length > 0 && (
              <div className="text-xs">
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
