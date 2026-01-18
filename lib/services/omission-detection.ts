import type { SentenceSpan } from './sentence-segmentation';
import type { Omission, OmissionType, DetectionMethod } from '@/lib/schemas/argument-decomposition';

// ============================================
// Omission Detection Result
// ============================================

export interface DetectedOmission {
  omissionType: OmissionType;
  detectionMethod: DetectionMethod;
  description: string;
  whyItMatters: string;
  relatedSentenceIndices: number[];
}

// ============================================
// Detection Patterns
// ============================================

// Numbers that should have sources
const NUMBER_PATTERNS = [
  /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|trillion))?/gi,
  /\d+(?:\.\d+)?%/g,
  /\d{1,3}(?:,\d{3})+/g,
  /(?:million|billion|trillion)\s*(?:dollars|people|jobs)?/gi,
];

// Source indicators
const SOURCE_INDICATORS = [
  /according to/i,
  /study (?:by|from|shows)/i,
  /research (?:by|from|shows)/i,
  /data (?:from|shows)/i,
  /report (?:by|from)/i,
  /survey (?:by|from|shows)/i,
  /analysis (?:by|from|shows)/i,
  /(?:the|a) \w+ (?:institute|university|center|foundation|bureau)/i,
];

// Policy-related patterns
const POLICY_PATTERNS = [
  /would (?:increase|decrease|raise|lower|cut|boost)/i,
  /will (?:increase|decrease|raise|lower|cut|boost)/i,
  /could (?:increase|decrease|raise|lower|cut|boost)/i,
  /(?:tax|tariff|subsidy|benefit|program) (?:increase|decrease|cut|expansion)/i,
  /(?:new|proposed|planned) (?:law|legislation|policy|regulation)/i,
];

// Timeframe indicators
const TIMEFRAME_INDICATORS = [
  /by \d{4}/i,
  /over the next \d+ years/i,
  /within \d+ (?:months|years)/i,
  /starting (?:in )?\d{4}/i,
  /effective (?:in )?\w+ \d{4}/i,
  /(?:short|medium|long)[- ]term/i,
];

// Stakeholder patterns
const STAKEHOLDER_PATTERNS = [
  /(?:workers|employees|consumers|businesses|families|seniors|students)/i,
  /(?:low|middle|high)[- ]income/i,
  /(?:small|large) businesses/i,
  /(?:rural|urban) (?:areas|communities)/i,
];

// Cost-related patterns
const COST_PATTERNS = [
  /(?:cost|price|expense|spending|budget)/i,
  /(?:funding|investment|expenditure)/i,
  /(?:deficit|debt|revenue)/i,
];

// ============================================
// Deterministic Detection Functions
// ============================================

function hasNumberWithoutSource(sentence: string): boolean {
  const hasNumber = NUMBER_PATTERNS.some(pattern => pattern.test(sentence));
  if (!hasNumber) return false;

  const hasSource = SOURCE_INDICATORS.some(pattern => pattern.test(sentence));
  return !hasSource;
}

function hasPolicyWithoutTimeframe(
  sentences: SentenceSpan[],
  sentenceIndex: number
): boolean {
  const sentence = sentences[sentenceIndex].text;
  const hasPolicy = POLICY_PATTERNS.some(pattern => pattern.test(sentence));
  if (!hasPolicy) return false;

  // Check this sentence and surrounding sentences for timeframe
  const checkIndices = [sentenceIndex - 1, sentenceIndex, sentenceIndex + 1]
    .filter(i => i >= 0 && i < sentences.length);

  const hasTimeframe = checkIndices.some(i =>
    TIMEFRAME_INDICATORS.some(pattern => pattern.test(sentences[i].text))
  );

  return !hasTimeframe;
}

function countStakeholderMentions(sentences: SentenceSpan[]): number {
  const stakeholderSet = new Set<string>();

  for (const sentence of sentences) {
    for (const pattern of STAKEHOLDER_PATTERNS) {
      const matches = sentence.text.match(pattern);
      if (matches) {
        stakeholderSet.add(matches[0].toLowerCase());
      }
    }
  }

  return stakeholderSet.size;
}

function hasCostEstimate(sentences: SentenceSpan[]): boolean {
  const fullText = sentences.map(s => s.text).join(' ');

  const hasCostMention = COST_PATTERNS.some(pattern => pattern.test(fullText));
  if (!hasCostMention) return true; // No cost discussion = no expectation

  // Check if there's a specific number associated with cost
  const hasCostNumber = /(?:cost|expense|spending|budget|funding|investment).*?\$[\d,]+/i.test(fullText) ||
    /\$[\d,]+.*?(?:cost|expense|spending|budget|funding|investment)/i.test(fullText);

  return hasCostNumber;
}

function hasCounterargument(sentences: SentenceSpan[]): boolean {
  const counterPatterns = [
    /however/i,
    /on the other hand/i,
    /critics (?:say|argue|contend)/i,
    /opponents (?:say|argue|contend)/i,
    /some (?:argue|say|believe)/i,
    /alternatively/i,
    /in contrast/i,
    /(?:but|yet) (?:others|some)/i,
  ];

  return sentences.some(s =>
    counterPatterns.some(pattern => pattern.test(s.text))
  );
}

// ============================================
// Main Detection Function
// ============================================

export function detectOmissions(
  sentences: SentenceSpan[],
  articleTitle: string
): DetectedOmission[] {
  const omissions: DetectedOmission[] = [];

  // Check for numbers without sources
  const unsourcedNumberSentences: number[] = [];
  for (const sentence of sentences) {
    if (hasNumberWithoutSource(sentence.text)) {
      unsourcedNumberSentences.push(sentence.sentenceIndex);
    }
  }

  if (unsourcedNumberSentences.length > 0) {
    omissions.push({
      omissionType: 'data_source',
      detectionMethod: 'deterministic',
      description: `Article contains ${unsourcedNumberSentences.length} numeric claims without cited sources`,
      whyItMatters: 'Statistics and numbers are more credible when their sources are identified, allowing readers to verify accuracy and assess reliability.',
      relatedSentenceIndices: unsourcedNumberSentences.slice(0, 5), // Limit to first 5
    });
  }

  // Check for policies without timeframes
  const noTimeframeSentences: number[] = [];
  for (let i = 0; i < sentences.length; i++) {
    if (hasPolicyWithoutTimeframe(sentences, i)) {
      noTimeframeSentences.push(sentences[i].sentenceIndex);
    }
  }

  if (noTimeframeSentences.length > 0) {
    omissions.push({
      omissionType: 'timeframe',
      detectionMethod: 'deterministic',
      description: 'Policy changes mentioned without clear implementation timeframes',
      whyItMatters: 'Understanding when policies take effect is crucial for assessing their impact and planning accordingly.',
      relatedSentenceIndices: noTimeframeSentences.slice(0, 5),
    });
  }

  // Check for limited stakeholder discussion
  const stakeholderCount = countStakeholderMentions(sentences);
  if (stakeholderCount < 2) {
    omissions.push({
      omissionType: 'stakeholder',
      detectionMethod: 'deterministic',
      description: 'Limited discussion of affected groups and stakeholders',
      whyItMatters: 'Policies affect different groups differently. Understanding all stakeholders helps readers assess the full impact.',
      relatedSentenceIndices: [],
    });
  }

  // Check for missing cost estimates
  if (!hasCostEstimate(sentences)) {
    omissions.push({
      omissionType: 'cost',
      detectionMethod: 'deterministic',
      description: 'Policy discussed without specific cost or budget estimates',
      whyItMatters: 'Cost information is essential for evaluating whether a policy is financially feasible and worth the investment.',
      relatedSentenceIndices: [],
    });
  }

  // Check for missing counterarguments
  if (!hasCounterargument(sentences)) {
    omissions.push({
      omissionType: 'counterargument',
      detectionMethod: 'deterministic',
      description: 'Article presents primarily one-sided perspective without acknowledging opposing views',
      whyItMatters: 'Balanced coverage of different perspectives helps readers form more informed opinions.',
      relatedSentenceIndices: [],
    });
  }

  return omissions;
}

// ============================================
// Convert to Full Omission Schema
// ============================================

export function toOmissionRecords(
  articleId: string,
  detections: DetectedOmission[]
): Array<{
  id: string;
  article_id: string;
  omission_type: OmissionType;
  detection_method: DetectionMethod;
  description: string;
  why_it_matters: string;
  related_sentences: Array<{ sentenceIndex: number }>;
}> {
  return detections.map(d => ({
    id: crypto.randomUUID(),
    article_id: articleId,
    omission_type: d.omissionType,
    detection_method: d.detectionMethod,
    description: d.description,
    why_it_matters: d.whyItMatters,
    related_sentences: d.relatedSentenceIndices.map(idx => ({ sentenceIndex: idx })),
  }));
}
