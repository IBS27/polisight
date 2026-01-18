// ============================================
// Text Normalization Utilities
// ============================================
// Cleans up common text formatting issues from extracted article content

/**
 * Removes spaces before punctuation marks
 * Examples:
 *   "word ." -> "word."
 *   "In another post , he said" -> "In another post, he said"
 */
export function removeSpacesBeforePunctuation(text: string): string {
  // Match one or more spaces followed by punctuation
  return text.replace(/\s+([.,:;!?])/g, '$1');
}

/**
 * Normalizes multiple consecutive spaces to a single space
 */
export function normalizeSpaces(text: string): string {
  return text.replace(/[ \t]+/g, ' ');
}

/**
 * Normalizes quote marks to standard ASCII versions and fixes spacing
 * Converts smart quotes to straight quotes for consistency
 */
export function normalizeQuotes(text: string): string {
  return text
    // Convert smart double quotes to straight quotes
    .replace(/[\u201C\u201D]/g, '"')
    // Convert smart single quotes to straight quotes
    .replace(/[\u2018\u2019]/g, "'");
}

/**
 * Main normalization function that applies all text cleaning
 * Call this before sentence segmentation
 */
export function normalizeArticleText(text: string): string {
  let normalized = text;

  // Step 1: Normalize quote characters first
  normalized = normalizeQuotes(normalized);

  // Step 2: Remove spaces before punctuation
  normalized = removeSpacesBeforePunctuation(normalized);

  // Step 3: Normalize multiple spaces
  normalized = normalizeSpaces(normalized);

  // Step 4: Trim lines while preserving paragraph structure
  normalized = normalized
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  return normalized.trim();
}
