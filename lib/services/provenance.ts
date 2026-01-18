import { createClient } from '@/lib/supabase/server';
import type { ProvenanceAction, ApiProvider } from '@/lib/schemas/core';

// ============================================
// Provenance Entry Types
// ============================================

export interface ProvenanceEntry {
  entityType: string;
  entityId: string;
  articleId?: string;
  action: ProvenanceAction;
  description: string;
  inputData?: unknown;
  outputData?: unknown;
  llmModel?: string;
  llmPrompt?: string;
  llmResponse?: string;
  durationMs?: number;
  apiProvider?: ApiProvider;
}

// ============================================
// In-Memory Buffer for Batch Logging
// ============================================

const logBuffer: ProvenanceEntry[] = [];
const BUFFER_FLUSH_THRESHOLD = 10;
const BUFFER_FLUSH_INTERVAL_MS = 5000;

let flushTimer: ReturnType<typeof setTimeout> | null = null;

// ============================================
// Main Logging Function
// ============================================

export async function logProvenance(entry: ProvenanceEntry): Promise<void> {
  // Add to buffer
  logBuffer.push(entry);

  // Flush if buffer is full
  if (logBuffer.length >= BUFFER_FLUSH_THRESHOLD) {
    await flushProvenanceBuffer();
  } else if (!flushTimer) {
    // Set up timer for eventual flush
    flushTimer = setTimeout(async () => {
      await flushProvenanceBuffer();
    }, BUFFER_FLUSH_INTERVAL_MS);
  }
}

// ============================================
// Immediate Logging (bypasses buffer)
// ============================================

export async function logProvenanceImmediate(entry: ProvenanceEntry): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('provenance_logs')
      .insert({
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        article_id: entry.articleId,
        action: entry.action,
        description: entry.description,
        input_data: entry.inputData,
        output_data: entry.outputData,
        llm_model: entry.llmModel,
        llm_prompt: entry.llmPrompt,
        llm_response: entry.llmResponse,
        duration_ms: entry.durationMs,
        api_provider: entry.apiProvider,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log provenance:', error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error('Error logging provenance:', error);
    return null;
  }
}

// ============================================
// Flush Buffer
// ============================================

async function flushProvenanceBuffer(): Promise<void> {
  if (logBuffer.length === 0) return;

  // Clear timer
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  // Take all entries from buffer
  const entries = logBuffer.splice(0, logBuffer.length);

  try {
    const supabase = await createClient();

    const records = entries.map(entry => ({
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      article_id: entry.articleId,
      action: entry.action,
      description: entry.description,
      input_data: entry.inputData,
      output_data: entry.outputData,
      llm_model: entry.llmModel,
      llm_prompt: entry.llmPrompt,
      llm_response: entry.llmResponse,
      duration_ms: entry.durationMs,
      api_provider: entry.apiProvider,
    }));

    const { error } = await supabase
      .from('provenance_logs')
      .insert(records);

    if (error) {
      console.error('Failed to flush provenance buffer:', error);
      // Re-add failed entries to buffer
      logBuffer.unshift(...entries);
    }
  } catch (error) {
    console.error('Error flushing provenance buffer:', error);
    // Re-add failed entries to buffer
    logBuffer.unshift(...entries);
  }
}

// ============================================
// Query Provenance
// ============================================

export async function getProvenanceForEntity(
  entityType: string,
  entityId: string
): Promise<ProvenanceEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('provenance_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to get provenance:', error);
    return [];
  }

  return data.map(row => ({
    entityType: row.entity_type,
    entityId: row.entity_id,
    articleId: row.article_id,
    action: row.action as ProvenanceAction,
    description: row.description,
    inputData: row.input_data,
    outputData: row.output_data,
    llmModel: row.llm_model,
    llmPrompt: row.llm_prompt,
    llmResponse: row.llm_response,
    durationMs: row.duration_ms,
    apiProvider: row.api_provider as ApiProvider,
  }));
}

export async function getProvenanceForArticle(
  articleId: string
): Promise<ProvenanceEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('provenance_logs')
    .select('*')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to get provenance for article:', error);
    return [];
  }

  return data.map(row => ({
    entityType: row.entity_type,
    entityId: row.entity_id,
    articleId: row.article_id,
    action: row.action as ProvenanceAction,
    description: row.description,
    inputData: row.input_data,
    outputData: row.output_data,
    llmModel: row.llm_model,
    llmPrompt: row.llm_prompt,
    llmResponse: row.llm_response,
    durationMs: row.duration_ms,
    apiProvider: row.api_provider as ApiProvider,
  }));
}

// ============================================
// Helper: Create Timed Logger
// ============================================

export function createTimedLogger(
  entityType: string,
  entityId: string,
  articleId?: string
) {
  const startTime = Date.now();

  return {
    async log(
      action: ProvenanceAction,
      description: string,
      options?: {
        inputData?: unknown;
        outputData?: unknown;
        llmModel?: string;
        llmPrompt?: string;
        llmResponse?: string;
        apiProvider?: ApiProvider;
      }
    ): Promise<void> {
      await logProvenance({
        entityType,
        entityId,
        articleId,
        action,
        description,
        durationMs: Date.now() - startTime,
        ...options,
      });
    },

    async logImmediate(
      action: ProvenanceAction,
      description: string,
      options?: {
        inputData?: unknown;
        outputData?: unknown;
        llmModel?: string;
        llmPrompt?: string;
        llmResponse?: string;
        apiProvider?: ApiProvider;
      }
    ): Promise<string | null> {
      return await logProvenanceImmediate({
        entityType,
        entityId,
        articleId,
        action,
        description,
        durationMs: Date.now() - startTime,
        ...options,
      });
    },

    getDurationMs(): number {
      return Date.now() - startTime;
    },
  };
}

// ============================================
// Cleanup on Server Shutdown
// ============================================

if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await flushProvenanceBuffer();
  });
}
