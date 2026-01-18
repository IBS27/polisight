'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, History, ChevronDown, ChevronUp, Clock, Database, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface ProvenanceEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  createdAt: string;
  durationMs?: number;
  llmModel?: string;
  apiProvider?: string;
  inputData?: unknown;
  outputData?: unknown;
}

interface ProvenanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
}

// ============================================
// Action Colors
// ============================================

const actionColors: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  extracted: 'bg-blue-100 text-blue-700',
  analyzed: 'bg-purple-100 text-purple-700',
  validated: 'bg-cyan-100 text-cyan-700',
  calculated: 'bg-amber-100 text-amber-700',
  updated: 'bg-gray-100 text-gray-700',
  error: 'bg-red-100 text-red-700',
};

// ============================================
// Component
// ============================================

export function ProvenanceDrawer({
  isOpen,
  onClose,
  articleId,
}: ProvenanceDrawerProps) {
  const [entries, setEntries] = useState<ProvenanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Fetch provenance when drawer opens
  useEffect(() => {
    if (isOpen && articleId) {
      fetchProvenance();
    }
  }, [isOpen, articleId]);

  const fetchProvenance = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/provenance`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch provenance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold">Audit Trail</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No provenance records yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry: ProvenanceEntry) => (
              <Card key={entry.id} className="text-sm">
                <CardHeader className="py-2 px-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={cn(
                            'text-xs',
                            actionColors[entry.action] || 'bg-gray-100'
                          )}
                        >
                          {entry.action}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {entry.entityType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700">{entry.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleExpanded(entry.id)}
                    >
                      {expandedEntries.has(entry.id) ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {expandedEntries.has(entry.id) && (
                  <CardContent className="py-2 px-3 pt-0 border-t">
                    <div className="space-y-2 text-xs">
                      {/* Metadata */}
                      <div className="flex flex-wrap gap-3 text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                        {entry.durationMs !== undefined ? (
                          <span className="flex items-center gap-1">
                            Duration: {formatDuration(entry.durationMs)}
                          </span>
                        ) : null}
                      </div>

                      {/* API Provider */}
                      {entry.apiProvider ? (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Database className="w-3 h-3" />
                          Provider: {entry.apiProvider}
                        </div>
                      ) : null}

                      {/* LLM Model */}
                      {entry.llmModel ? (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Bot className="w-3 h-3" />
                          Model: {entry.llmModel}
                        </div>
                      ) : null}

                      {/* Input/Output Data */}
                      {entry.inputData !== undefined ? (
                        <div>
                          <span className="font-medium text-gray-600">Input:</span>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {String(JSON.stringify(entry.inputData, null, 2))}
                          </pre>
                        </div>
                      ) : null}
                      {entry.outputData !== undefined ? (
                        <div>
                          <span className="font-medium text-gray-600">Output:</span>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {String(JSON.stringify(entry.outputData, null, 2))}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t text-xs text-gray-500">
        <p>
          This audit trail shows all operations performed on this article,
          including data sources and AI model calls.
        </p>
      </div>
    </div>
  );
}
