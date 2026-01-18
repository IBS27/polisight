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
// URL Detection
// ============================================

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * Cleans trailing punctuation from a URL that was likely part of surrounding text.
 * Handles balanced parentheses (e.g., Wikipedia URLs can contain parens).
 */
function cleanUrlTrailingPunctuation(rawUrl: string): { url: string; trailingChars: string } {
  let url = rawUrl;
  let trailingChars = '';

  // Keep stripping trailing punctuation until we have a clean URL
  while (url.length > 0) {
    const lastChar = url[url.length - 1];

    // Common punctuation that appears after URLs in text
    if ([',', '.', ';', ':', '!', '?'].includes(lastChar)) {
      trailingChars = lastChar + trailingChars;
      url = url.slice(0, -1);
      continue;
    }

    // Handle closing brackets - only strip if unbalanced
    if (lastChar === ')') {
      const openCount = (url.match(/\(/g) || []).length;
      const closeCount = (url.match(/\)/g) || []).length;
      if (closeCount > openCount) {
        trailingChars = lastChar + trailingChars;
        url = url.slice(0, -1);
        continue;
      }
    }

    if (lastChar === ']') {
      const openCount = (url.match(/\[/g) || []).length;
      const closeCount = (url.match(/\]/g) || []).length;
      if (closeCount > openCount) {
        trailingChars = lastChar + trailingChars;
        url = url.slice(0, -1);
        continue;
      }
    }

    // No more trailing punctuation to strip
    break;
  }

  return { url, trailingChars };
}

function parseTextWithLinks(text: string): (string | { url: string; display: string })[] {
  const parts: (string | { url: string; display: string })[] = [];
  let lastIndex = 0;
  let match;

  // Create a new regex instance to avoid state issues with global flag
  const regex = new RegExp(URL_REGEX.source, URL_REGEX.flags);

  while ((match = regex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Clean trailing punctuation from the matched URL
    const { url: cleanedUrl, trailingChars } = cleanUrlTrailingPunctuation(match[0]);

    // Add the URL - prefix www. URLs with https://
    const href = cleanedUrl.startsWith('www.') ? `https://${cleanedUrl}` : cleanedUrl;
    parts.push({ url: href, display: cleanedUrl });

    // Add back the trailing punctuation as plain text
    if (trailingChars) {
      parts.push(trailingChars);
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
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

  // Reduced padding and rounding for tighter sentence spacing
  // box-decoration-clone ensures highlights maintain appearance when wrapping lines
  const baseClasses = 'py-0.5 px-0.5 rounded-sm cursor-pointer transition-colors duration-150 box-decoration-clone';
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
      {parseTextWithLinks(text).map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
            onClick={(e) => e.stopPropagation()}
          >
            {part.display}
          </a>
        )
      )}{' '}
    </span>
  );
}
