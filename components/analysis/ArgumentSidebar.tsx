'use client';

import { useState } from 'react';
import { ArgumentElementCard } from './ArgumentElementCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type TabType = 'claims' | 'assumptions' | 'predictions' | 'values';

interface Claim {
  id: string;
  content: string;
  claimType: string;
  isVerifiable: boolean;
  confidence: number;
  sourceSentences: Array<{ sentenceIndex: number }>;
}

interface Assumption {
  id: string;
  content: string;
  isExplicit: boolean;
  criticality: string;
  confidence: number;
  sourceSentences: Array<{ sentenceIndex: number }>;
}

interface Prediction {
  id: string;
  content: string;
  timeframe?: string;
  conditions?: string;
  confidence: number;
  sourceSentences: Array<{ sentenceIndex: number }>;
}

interface Value {
  id: string;
  content: string;
  category: string;
  isExplicit: boolean;
  confidence: number;
  sourceSentences: Array<{ sentenceIndex: number }>;
}

interface ArgumentSidebarProps {
  claims: Claim[];
  assumptions: Assumption[];
  predictions: Prediction[];
  values: Value[];
  selectedElementId: string | null;
  highlightedElementId: string | null;
  onElementSelect: (id: string) => void;
}

// ============================================
// Tab Configuration
// ============================================

const tabs: Array<{ key: TabType; label: string; color: string }> = [
  { key: 'claims', label: 'Claims', color: 'bg-blue-500' },
  { key: 'assumptions', label: 'Assumptions', color: 'bg-amber-500' },
  { key: 'predictions', label: 'Predictions', color: 'bg-purple-500' },
  { key: 'values', label: 'Values', color: 'bg-green-500' },
];

// ============================================
// Component
// ============================================

export function ArgumentSidebar({
  claims,
  assumptions,
  predictions,
  values,
  selectedElementId,
  highlightedElementId,
  onElementSelect,
}: ArgumentSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('claims');

  const counts = {
    claims: claims.length,
    assumptions: assumptions.length,
    predictions: predictions.length,
    values: values.length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Header */}
      <div className="flex border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 px-2 py-2 text-xs font-medium transition-colors',
              'border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <span className="flex items-center justify-center gap-1">
              <span
                className={cn('w-2 h-2 rounded-full', tab.color)}
              />
              {tab.label}
              <span className="text-gray-400">({counts[tab.key]})</span>
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {activeTab === 'claims' && (
          <>
            {claims.length === 0 ? (
              <EmptyState type="claims" />
            ) : (
              claims.map((claim) => (
                <ArgumentElementCard
                  key={claim.id}
                  id={claim.id}
                  type="claim"
                  content={claim.content}
                  confidence={claim.confidence}
                  isSelected={selectedElementId === claim.id}
                  isHighlighted={highlightedElementId === claim.id}
                  onClick={onElementSelect}
                  claimType={claim.claimType}
                  isVerifiable={claim.isVerifiable}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'assumptions' && (
          <>
            {assumptions.length === 0 ? (
              <EmptyState type="assumptions" />
            ) : (
              assumptions.map((assumption) => (
                <ArgumentElementCard
                  key={assumption.id}
                  id={assumption.id}
                  type="assumption"
                  content={assumption.content}
                  confidence={assumption.confidence}
                  isSelected={selectedElementId === assumption.id}
                  isHighlighted={highlightedElementId === assumption.id}
                  onClick={onElementSelect}
                  isExplicit={assumption.isExplicit}
                  criticality={assumption.criticality}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'predictions' && (
          <>
            {predictions.length === 0 ? (
              <EmptyState type="predictions" />
            ) : (
              predictions.map((prediction) => (
                <ArgumentElementCard
                  key={prediction.id}
                  id={prediction.id}
                  type="prediction"
                  content={prediction.content}
                  confidence={prediction.confidence}
                  isSelected={selectedElementId === prediction.id}
                  isHighlighted={highlightedElementId === prediction.id}
                  onClick={onElementSelect}
                  timeframe={prediction.timeframe}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'values' && (
          <>
            {values.length === 0 ? (
              <EmptyState type="values" />
            ) : (
              values.map((value) => (
                <ArgumentElementCard
                  key={value.id}
                  id={value.id}
                  type="value"
                  content={value.content}
                  confidence={value.confidence}
                  isSelected={selectedElementId === value.id}
                  isHighlighted={highlightedElementId === value.id}
                  onClick={onElementSelect}
                  category={value.category}
                  isExplicit={value.isExplicit}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// Empty State
// ============================================

function EmptyState({ type }: { type: string }) {
  return (
    <div className="text-center py-8 text-gray-500">
      <p className="text-sm">No {type} identified</p>
      <p className="text-xs mt-1">
        Run analysis to detect {type} in the article
      </p>
    </div>
  );
}
