'use client';

import { ContextCard } from './ContextCard';
import { BookOpen } from 'lucide-react';

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

interface ContextCardData {
  id: string;
  contextFor: 'claim' | 'assumption' | 'omission' | 'general';
  relatedElementId?: string;
  title: string;
  summary: string;
  keyFacts: KeyFact[];
  citations: Citation[];
}

interface ContextCardsPanelProps {
  contextCards: ContextCardData[];
}

// ============================================
// Component
// ============================================

export function ContextCardsPanel({ contextCards }: ContextCardsPanelProps) {
  if (contextCards.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No context cards yet</p>
        <p className="text-xs mt-1">
          Run context expansion to get background information with sources
        </p>
      </div>
    );
  }

  // Group by context type
  const claimCards = contextCards.filter(c => c.contextFor === 'claim');
  const assumptionCards = contextCards.filter(c => c.contextFor === 'assumption');
  const omissionCards = contextCards.filter(c => c.contextFor === 'omission');
  const generalCards = contextCards.filter(c => c.contextFor === 'general');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">
          Background Context ({contextCards.length})
        </h3>
      </div>

      {/* Claims Context */}
      {claimCards.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-blue-600">For Claims</h4>
          {claimCards.map((card) => (
            <ContextCard
              key={card.id}
              id={card.id}
              contextFor={card.contextFor}
              title={card.title}
              summary={card.summary}
              keyFacts={card.keyFacts}
              citations={card.citations}
            />
          ))}
        </div>
      )}

      {/* Assumptions Context */}
      {assumptionCards.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-amber-600">For Assumptions</h4>
          {assumptionCards.map((card) => (
            <ContextCard
              key={card.id}
              id={card.id}
              contextFor={card.contextFor}
              title={card.title}
              summary={card.summary}
              keyFacts={card.keyFacts}
              citations={card.citations}
            />
          ))}
        </div>
      )}

      {/* Omissions Context */}
      {omissionCards.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-orange-600">For Omissions</h4>
          {omissionCards.map((card) => (
            <ContextCard
              key={card.id}
              id={card.id}
              contextFor={card.contextFor}
              title={card.title}
              summary={card.summary}
              keyFacts={card.keyFacts}
              citations={card.citations}
            />
          ))}
        </div>
      )}

      {/* General Context */}
      {generalCards.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-gray-600">General Background</h4>
          {generalCards.map((card) => (
            <ContextCard
              key={card.id}
              id={card.id}
              contextFor={card.contextFor}
              title={card.title}
              summary={card.summary}
              keyFacts={card.keyFacts}
              citations={card.citations}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        Context cards provide background information from external sources to help
        you evaluate claims and understand what the article may not cover.
      </p>
    </div>
  );
}
