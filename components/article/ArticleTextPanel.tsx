'use client';

import { useState, useMemo } from 'react';
import { SentenceDisplay, type SentenceHighlight } from './SentenceDisplay';

// ============================================
// Types
// ============================================

interface Sentence {
  id: string;
  index: number;
  text: string;
  paragraphIndex: number;
}

interface ArgumentElement {
  id: string;
  type: 'claim' | 'assumption' | 'prediction' | 'value';
  sourceSentences: Array<{ sentenceIndex: number }>;
}

interface ArticleTextPanelProps {
  title: string;
  author?: string;
  publishDate?: string;
  siteName?: string;
  sentences: Sentence[];
  argumentElements: ArgumentElement[];
  selectedElementId: string | null;
  onSentenceSelect: (index: number) => void;
  onElementHighlight: (elementId: string | null) => void;
}

// ============================================
// Component
// ============================================

export function ArticleTextPanel({
  title,
  author,
  publishDate,
  siteName,
  sentences,
  argumentElements,
  selectedElementId,
  onSentenceSelect,
  onElementHighlight,
}: ArticleTextPanelProps) {
  const [hoveredSentence, setHoveredSentence] = useState<number | null>(null);

  // Build highlight map: sentenceIndex -> highlights
  const highlightMap = useMemo(() => {
    const map = new Map<number, SentenceHighlight[]>();

    for (const element of argumentElements) {
      for (const ref of element.sourceSentences) {
        const existing = map.get(ref.sentenceIndex) || [];
        existing.push({
          sentenceIndex: ref.sentenceIndex,
          type: element.type,
          elementId: element.id,
        });
        map.set(ref.sentenceIndex, existing);
      }
    }

    return map;
  }, [argumentElements]);

  // Get selected sentence indices
  const selectedSentenceIndices = useMemo(() => {
    if (!selectedElementId) return new Set<number>();

    const element = argumentElements.find(e => e.id === selectedElementId);
    if (!element) return new Set<number>();

    return new Set(element.sourceSentences.map(s => s.sentenceIndex));
  }, [selectedElementId, argumentElements]);

  // Group sentences by paragraph
  const paragraphs = useMemo(() => {
    const groups: Sentence[][] = [];
    let currentParagraph: Sentence[] = [];
    let currentParagraphIndex = sentences[0]?.paragraphIndex ?? 0;

    for (const sentence of sentences) {
      if (sentence.paragraphIndex !== currentParagraphIndex) {
        if (currentParagraph.length > 0) {
          groups.push(currentParagraph);
        }
        currentParagraph = [];
        currentParagraphIndex = sentence.paragraphIndex;
      }
      currentParagraph.push(sentence);
    }

    if (currentParagraph.length > 0) {
      groups.push(currentParagraph);
    }

    return groups;
  }, [sentences]);

  // Handle hover to highlight related element
  const handleSentenceHover = (index: number | null) => {
    setHoveredSentence(index);

    if (index !== null) {
      const highlights = highlightMap.get(index);
      if (highlights && highlights.length > 0) {
        onElementHighlight(highlights[0].elementId);
      } else {
        onElementHighlight(null);
      }
    } else {
      onElementHighlight(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Article Header */}
      <div className="mb-6 pb-4 border-b">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
          {author && <span>By {author}</span>}
          {author && (publishDate || siteName) && <span>•</span>}
          {publishDate && (
            <span>{new Date(publishDate).toLocaleDateString()}</span>
          )}
          {publishDate && siteName && <span>•</span>}
          {siteName && <span>{siteName}</span>}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-200 border-l-2 border-blue-500 rounded-sm" />
          <span>Claims</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-200 border-l-2 border-amber-500 rounded-sm" />
          <span>Assumptions</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-200 border-l-2 border-purple-500 rounded-sm" />
          <span>Predictions</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-200 border-l-2 border-green-500 rounded-sm" />
          <span>Values</span>
        </div>
      </div>

      {/* Article Text */}
      <div className="flex-1 overflow-y-auto prose prose-sm max-w-none">
        {paragraphs.map((paragraph, pIdx) => (
          <p key={pIdx} className="mb-4 leading-relaxed">
            {paragraph.map((sentence) => (
              <SentenceDisplay
                key={sentence.id}
                index={sentence.index}
                text={sentence.text}
                highlights={highlightMap.get(sentence.index) || []}
                isSelected={selectedSentenceIndices.has(sentence.index)}
                onSelect={onSentenceSelect}
                onHover={handleSentenceHover}
              />
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
