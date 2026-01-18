'use client';

import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface SentenceHighlight {
  sentenceIndex: number;
  type: 'claim' | 'assumption' | 'prediction' | 'value';
  elementId: string;
}

interface SentenceDisplayProps {
  index: number;
  text: string;
  highlights: SentenceHighlight[];
  isSelected: boolean;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

// ============================================
// Highlight Colors
// ============================================

const highlightColors = {
  claim: 'bg-blue-100 border-l-blue-500 hover:bg-blue-150',
  assumption: 'bg-amber-100 border-l-amber-500 hover:bg-amber-150',
  prediction: 'bg-purple-100 border-l-purple-500 hover:bg-purple-150',
  value: 'bg-green-100 border-l-green-500 hover:bg-green-150',
};

const selectedColors = {
  claim: 'bg-blue-200 border-l-blue-600',
  assumption: 'bg-amber-200 border-l-amber-600',
  prediction: 'bg-purple-200 border-l-purple-600',
  value: 'bg-green-200 border-l-green-600',
};

// ============================================
// Component
// ============================================

export function SentenceDisplay({
  index,
  text,
  highlights,
  isSelected,
  onSelect,
  onHover,
}: SentenceDisplayProps) {
  const primaryHighlight = highlights[0];
  const hasHighlight = highlights.length > 0;

  const baseClasses = 'py-1 px-2 rounded cursor-pointer transition-colors duration-150';
  const highlightClasses = hasHighlight
    ? cn(
        'border-l-4',
        isSelected
          ? selectedColors[primaryHighlight.type]
          : highlightColors[primaryHighlight.type]
      )
    : 'hover:bg-gray-100';

  return (
    <span
      className={cn(baseClasses, highlightClasses)}
      onClick={() => onSelect(index)}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      data-sentence-index={index}
      data-highlight-types={highlights.map(h => h.type).join(',')}
    >
      {text}{' '}
    </span>
  );
}
