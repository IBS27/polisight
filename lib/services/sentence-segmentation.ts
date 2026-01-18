// ============================================
// Sentence Span Interface
// ============================================

export interface SentenceSpan {
  text: string;
  startChar: number;
  endChar: number;
  paragraphIndex: number;
  sentenceIndex: number;
}

// ============================================
// Common Abbreviations to Handle
// ============================================

const ABBREVIATIONS = new Set([
  // Titles
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'rev', 'gen', 'col', 'lt', 'sgt',
  // Academic
  'ph', 'ed', 'b', 'm', 'd',
  // Geographic
  'st', 'ave', 'blvd', 'rd', 'mt', 'ft',
  // US States (2-letter)
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il',
  'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt',
  'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri',
  'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc',
  // Organizations/Other
  'inc', 'ltd', 'corp', 'co', 'vs', 'etc', 'eg', 'ie', 'al', 'et',
  // Common initialisms that might have periods
  'u', 's', 'a', 'e', 'i', 'o',
]);

// ============================================
// Sentence Boundary Detection
// ============================================

function isAbbreviation(word: string): boolean {
  // Remove the period and check
  const cleaned = word.replace(/\.$/, '').toLowerCase();

  // Check if it's a known abbreviation
  if (ABBREVIATIONS.has(cleaned)) {
    return true;
  }

  // Check for initials (single uppercase letter followed by period)
  if (/^[A-Z]$/.test(cleaned)) {
    return true;
  }

  // Check for multi-letter abbreviations like "U.S." or "U.N."
  if (/^([A-Z]\.)+[A-Z]?$/.test(word)) {
    return true;
  }

  return false;
}

function isEndOfSentence(
  text: string,
  position: number,
  char: string
): boolean {
  // Must be a sentence-ending punctuation
  if (char !== '.' && char !== '!' && char !== '?') {
    return false;
  }

  // Check what comes before the punctuation
  const beforeMatch = text.slice(Math.max(0, position - 20), position).match(/(\S+)$/);
  const wordBefore = beforeMatch ? beforeMatch[1] : '';

  // Check what comes after
  const afterText = text.slice(position + 1, position + 10);
  const afterMatch = afterText.match(/^\s*(\S)/);
  const charAfter = afterMatch ? afterMatch[1] : '';

  // If followed by lowercase, probably not end of sentence (unless it's a quote)
  if (charAfter && /[a-z]/.test(charAfter) && charAfter !== '"' && charAfter !== "'") {
    return false;
  }

  // Check for abbreviations (only for periods)
  if (char === '.' && wordBefore) {
    if (isAbbreviation(wordBefore + '.')) {
      // But if followed by capital letter and space, might still be end
      if (afterMatch && /^\s+[A-Z]/.test(afterText)) {
        // Could be end of sentence with abbreviation
        // Use heuristic: if the abbreviation is a title, probably not end
        const cleanWord = wordBefore.toLowerCase();
        if (['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'rev', 'gen', 'col', 'lt', 'sgt'].includes(cleanWord)) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  // Check for ellipsis
  if (char === '.' && text.slice(position, position + 3) === '...') {
    return false;
  }

  // Check for decimal numbers
  if (char === '.' && /\d$/.test(wordBefore) && /^\d/.test(charAfter || '')) {
    return false;
  }

  // Must be followed by whitespace or end of text (or quote)
  if (position < text.length - 1) {
    const nextChar = text[position + 1];
    if (!/[\s"'\u201C\u201D\u2018\u2019]/.test(nextChar)) {
      return false;
    }
  }

  return true;
}

// ============================================
// Main Segmentation Function
// ============================================

export function segmentSentences(text: string): SentenceSpan[] {
  const sentences: SentenceSpan[] = [];

  // First, split by paragraphs (double newline or significant whitespace)
  const paragraphs = text.split(/\n\s*\n/);

  let globalCharOffset = 0;
  let globalSentenceIndex = 0;

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
    const paragraph = paragraphs[paragraphIndex];

    if (!paragraph.trim()) {
      // Account for the paragraph separator
      globalCharOffset += paragraph.length + 2; // +2 for \n\n
      continue;
    }

    // Find sentence boundaries within paragraph
    const sentenceBoundaries: number[] = [];

    for (let i = 0; i < paragraph.length; i++) {
      const char = paragraph[i];
      if (isEndOfSentence(paragraph, i, char)) {
        sentenceBoundaries.push(i);
      }
    }

    // Create sentence spans
    let sentenceStart = 0;

    for (const boundaryIndex of sentenceBoundaries) {
      const sentenceText = paragraph.slice(sentenceStart, boundaryIndex + 1).trim();

      if (sentenceText.length > 0) {
        // Find actual start (skip leading whitespace)
        const leadingWhitespace = paragraph.slice(sentenceStart).match(/^\s*/)?.[0].length || 0;
        const actualStart = sentenceStart + leadingWhitespace;

        sentences.push({
          text: sentenceText,
          startChar: globalCharOffset + actualStart,
          endChar: globalCharOffset + boundaryIndex + 1,
          paragraphIndex,
          sentenceIndex: globalSentenceIndex++,
        });
      }

      sentenceStart = boundaryIndex + 1;
    }

    // Handle remaining text (sentence without ending punctuation)
    const remaining = paragraph.slice(sentenceStart).trim();
    if (remaining.length > 0) {
      const leadingWhitespace = paragraph.slice(sentenceStart).match(/^\s*/)?.[0].length || 0;
      const actualStart = sentenceStart + leadingWhitespace;

      sentences.push({
        text: remaining,
        startChar: globalCharOffset + actualStart,
        endChar: globalCharOffset + paragraph.length,
        paragraphIndex,
        sentenceIndex: globalSentenceIndex++,
      });
    }

    // Update global offset (paragraph + separator)
    globalCharOffset += paragraph.length;
    if (paragraphIndex < paragraphs.length - 1) {
      // Account for the separator that was split on
      const separatorMatch = text.slice(globalCharOffset).match(/^\n\s*\n/);
      if (separatorMatch) {
        globalCharOffset += separatorMatch[0].length;
      }
    }
  }

  return sentences;
}

// ============================================
// Utility Functions
// ============================================

export function getSentenceByIndex(
  sentences: SentenceSpan[],
  index: number
): SentenceSpan | undefined {
  return sentences.find(s => s.sentenceIndex === index);
}

export function getSentencesByParagraph(
  sentences: SentenceSpan[],
  paragraphIndex: number
): SentenceSpan[] {
  return sentences.filter(s => s.paragraphIndex === paragraphIndex);
}

export function getTextSpan(
  originalText: string,
  startChar: number,
  endChar: number
): string {
  return originalText.slice(startChar, endChar);
}

// Verify that sentence spans correctly map back to original text
export function verifySentenceSpans(
  originalText: string,
  sentences: SentenceSpan[]
): boolean {
  for (const sentence of sentences) {
    const extracted = originalText.slice(sentence.startChar, sentence.endChar).trim();
    if (extracted !== sentence.text) {
      console.warn(
        `Sentence span mismatch at index ${sentence.sentenceIndex}:`,
        { expected: sentence.text, got: extracted }
      );
      return false;
    }
  }
  return true;
}
