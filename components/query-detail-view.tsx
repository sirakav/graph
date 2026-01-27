'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  X,
  Pencil,
  Plus,
  Eye,
  EyeOff,
  Code2,
  FileText,
  Table,
  Network,
  Tag,
  ChevronDown,
} from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  useSavedQueriesStore, 
  type SavedQuery, 
  type ContextQuery,
  type ExpectedResult,
  type QueryGraphMapping,
} from '@/lib/saved-queries-store';
import { useGraphStore } from '@/lib/graph-store';

// CodeMirror theme for dark mode
const darkTheme = {
  '&': {
    backgroundColor: 'transparent',
    fontSize: '13px',
  },
  '.cm-content': {
    caretColor: '#fff',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    borderRight: '1px solid #27272a',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(39, 39, 42, 0.5)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(39, 39, 42, 0.3)',
  },
};

interface QueryDetailViewProps {
  query: SavedQuery;
  onEdit: () => void;
  onClose: () => void;
}

export function QueryDetailView({ query, onEdit, onClose }: QueryDetailViewProps) {
  const [activeTab, setActiveTab] = useState<string>('main');
  const [showMapping, setShowMapping] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(true);
  const [mappingOpen, setMappingOpen] = useState(true);
  
  const setActiveContextTab = useSavedQueriesStore((state) => state.setActiveContextTab);
  const setHighlights = useGraphStore((state) => state.setHighlights);
  const clearHighlights = useGraphStore((state) => state.clearHighlights);

  const contextKeys = useMemo(() => 
    query.contextQueries ? Object.keys(query.contextQueries) : [],
    [query.contextQueries]
  );

  // Get the current content based on active tab
  const currentContent = useMemo(() => {
    if (activeTab === 'main') {
      return {
        name: query.name,
        query: query.query,
        description: query.description,
        expectedResults: query.expectedResults,
        graphMapping: query.graphMapping,
      };
    }
    const contextQuery = query.contextQueries?.[activeTab];
    if (contextQuery) {
      return {
        name: contextQuery.name,
        query: contextQuery.query,
        description: contextQuery.description,
        expectedResults: contextQuery.expectedResults,
        graphMapping: contextQuery.graphMapping,
      };
    }
    return null;
  }, [activeTab, query]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setActiveContextTab(tab === 'main' ? null : tab);
    
    // Clear highlights when switching tabs
    if (showMapping) {
      clearHighlights();
      setShowMapping(false);
    }
  }, [setActiveContextTab, showMapping, clearHighlights]);

  const handleToggleMapping = useCallback(() => {
    const newShowMapping = !showMapping;
    setShowMapping(newShowMapping);
    
    if (newShowMapping && currentContent?.graphMapping) {
      const mapping = currentContent.graphMapping;
      setHighlights(
        mapping.highlightNodeIds || [],
        mapping.highlightEdgeIds || [],
        mapping.targetNodeLabels || [],
        mapping.targetRelationshipTypes || []
      );
    } else {
      clearHighlights();
    }
  }, [showMapping, currentContent, setHighlights, clearHighlights]);

  // Cleanup highlights on unmount
  const handleClose = useCallback(() => {
    clearHighlights();
    onClose();
  }, [clearHighlights, onClose]);

  if (!currentContent) return null;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
            <Code2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium truncate">{query.name}</h3>
            {query.tags && query.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                {query.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 h-4">
                    {tag}
                  </Badge>
                ))}
                {query.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{query.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onEdit}>
                <Pencil className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit query</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="icon-sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Context Query Tabs */}
      {contextKeys.length > 0 && (
        <div className="px-4 pt-3 shrink-0">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="main" className="text-xs">
                Main Query
              </TabsTrigger>
              {contextKeys.map((key) => (
                <TabsTrigger key={key} value={key} className="text-xs">
                  {query.contextQueries![key].name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Query Code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Code2 className="w-3.5 h-3.5" />
                {activeTab === 'main' ? 'Cypher Query' : currentContent.name}
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden bg-zinc-950">
              <CodeMirror
                value={currentContent.query}
                extensions={[sql()]}
                theme="dark"
                editable={false}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  highlightActiveLine: false,
                }}
                className="text-sm"
              />
            </div>
          </div>

          {/* Description */}
          {currentContent.description && (
            <Collapsible open={descriptionOpen} onOpenChange={setDescriptionOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${descriptionOpen ? '' : '-rotate-90'}`} />
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  Description
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {currentContent.description}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Expected Results */}
          {currentContent.expectedResults && currentContent.expectedResults.rows.length > 0 && (
            <Collapsible open={resultsOpen} onOpenChange={setResultsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${resultsOpen ? '' : '-rotate-90'}`} />
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Table className="w-3.5 h-3.5" />
                  Expected Results
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                    {currentContent.expectedResults.rows.length} rows
                  </Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <TableComponent>
                    <TableHeader>
                      <TableRow>
                        {currentContent.expectedResults.columns.map((col) => (
                          <TableHead key={col} className="text-xs font-medium">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentContent.expectedResults.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          {currentContent.expectedResults!.columns.map((col) => (
                            <TableCell key={col} className="text-xs">
                              {formatCellValue(row[col])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableComponent>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Graph Mapping */}
          {currentContent.graphMapping && (
            <Collapsible open={mappingOpen} onOpenChange={setMappingOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${mappingOpen ? '' : '-rotate-90'}`} />
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Network className="w-3.5 h-3.5" />
                  Graph Mapping
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-3">
                  {/* Target Node Labels */}
                  {currentContent.graphMapping.targetNodeLabels && 
                   currentContent.graphMapping.targetNodeLabels.length > 0 && (
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                        Target Nodes
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentContent.graphMapping.targetNodeLabels.map((label) => (
                          <Badge 
                            key={label} 
                            variant="secondary"
                            className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30"
                          >
                            :{label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Target Relationship Types */}
                  {currentContent.graphMapping.targetRelationshipTypes && 
                   currentContent.graphMapping.targetRelationshipTypes.length > 0 && (
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                        Target Relationships
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentContent.graphMapping.targetRelationshipTypes.map((type) => (
                          <Badge 
                            key={type} 
                            variant="secondary"
                            className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30"
                          >
                            [{type}]
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show on Graph Button */}
                  <Separator className="my-2" />
                  <Button
                    variant={showMapping ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={handleToggleMapping}
                    className="w-full gap-2"
                  >
                    {showMapping ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide on Graph
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Show on Graph
                      </>
                    )}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Context Queries Summary (only on main tab) */}
          {activeTab === 'main' && contextKeys.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                <Tag className="w-3.5 h-3.5" />
                Context Queries ({contextKeys.length})
              </div>
              <div className="space-y-2">
                {contextKeys.map((key) => {
                  const ctx = query.contextQueries![key];
                  return (
                    <button
                      key={key}
                      onClick={() => handleTabChange(key)}
                      className="w-full p-3 text-left rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{ctx.name}</span>
                        {ctx.expectedResults && (
                          <Badge variant="secondary" className="text-[10px]">
                            {ctx.expectedResults.rows.length} results
                          </Badge>
                        )}
                      </div>
                      {ctx.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {ctx.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper function to format cell values
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (Array.isArray(value)) return value.join(', ');
  return JSON.stringify(value);
}
