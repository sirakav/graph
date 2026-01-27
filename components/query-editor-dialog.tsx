'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Code2,
  Tag,
  FileText,
  Table,
  Network,
  ChevronDown,
  X,
  Layers,
} from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useSavedQueriesStore, 
  type SavedQuery, 
  type ContextQuery,
  type ExpectedResult,
  type QueryGraphMapping,
} from '@/lib/saved-queries-store';
import { useGraphStore } from '@/lib/graph-store';
import type { SchemaNodeData, SchemaEdgeData } from '@/lib/arrow-parser';

interface QueryEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query?: SavedQuery | null;
}

interface ExpectedResultRow {
  id: string;
  values: Record<string, string>;
}

interface ContextQueryForm {
  key: string;
  name: string;
  query: string;
  description: string;
}

export function QueryEditorDialog({ open, onOpenChange, query }: QueryEditorDialogProps) {
  const saveQuery = useSavedQueriesStore((state) => state.saveQuery);
  const updateQuery = useSavedQueriesStore((state) => state.updateQuery);
  
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);

  // Extract available labels and relationship types from current graph
  const availableLabels = Array.from(new Set(
    nodes.flatMap((n) => (n.data as SchemaNodeData).labels || [])
  )).sort();
  
  const availableRelTypes = Array.from(new Set(
    edges.map((e) => (e.data as SchemaEdgeData).relationshipType).filter(Boolean)
  )).sort();

  // Form state
  const [name, setName] = useState('');
  const [queryText, setQueryText] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Expected results state
  const [columns, setColumns] = useState<string[]>([]);
  const [newColumn, setNewColumn] = useState('');
  const [rows, setRows] = useState<ExpectedResultRow[]>([]);
  
  // Graph mapping state
  const [targetNodeLabels, setTargetNodeLabels] = useState<string[]>([]);
  const [targetRelTypes, setTargetRelTypes] = useState<string[]>([]);
  
  // Context queries state
  const [contextQueries, setContextQueries] = useState<ContextQueryForm[]>([]);
  const [activeContextTab, setActiveContextTab] = useState<string | null>(null);

  // Collapsible sections state
  const [sectionsOpen, setSectionsOpen] = useState({
    description: true,
    results: false,
    mapping: false,
    context: false,
  });

  // Initialize form when editing existing query
  useEffect(() => {
    if (query) {
      setName(query.name);
      setQueryText(query.query);
      setDescription(query.description || '');
      setTags(query.tags || []);
      
      if (query.expectedResults) {
        setColumns(query.expectedResults.columns);
        setRows(query.expectedResults.rows.map((row, idx) => ({
          id: `row_${idx}`,
          values: Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k, String(v ?? '')])
          ),
        })));
      } else {
        setColumns([]);
        setRows([]);
      }
      
      if (query.graphMapping) {
        setTargetNodeLabels(query.graphMapping.targetNodeLabels || []);
        setTargetRelTypes(query.graphMapping.targetRelationshipTypes || []);
      } else {
        setTargetNodeLabels([]);
        setTargetRelTypes([]);
      }
      
      if (query.contextQueries) {
        setContextQueries(
          Object.entries(query.contextQueries).map(([key, ctx]) => ({
            key,
            name: ctx.name,
            query: ctx.query,
            description: ctx.description || '',
          }))
        );
      } else {
        setContextQueries([]);
      }
    } else {
      // Reset form for new query
      setName('');
      setQueryText('');
      setDescription('');
      setTags([]);
      setColumns([]);
      setRows([]);
      setTargetNodeLabels([]);
      setTargetRelTypes([]);
      setContextQueries([]);
      setActiveContextTab(null);
    }
  }, [query, open]);

  // Tag handlers
  const handleAddTag = useCallback(() => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  }, [tags]);

  // Column handlers
  const handleAddColumn = useCallback(() => {
    const trimmed = newColumn.trim();
    if (trimmed && !columns.includes(trimmed)) {
      setColumns([...columns, trimmed]);
      setNewColumn('');
      // Add the column to all existing rows
      setRows(rows.map((row) => ({
        ...row,
        values: { ...row.values, [trimmed]: '' },
      })));
    }
  }, [newColumn, columns, rows]);

  const handleRemoveColumn = useCallback((col: string) => {
    setColumns(columns.filter((c) => c !== col));
    setRows(rows.map((row) => {
      const { [col]: _, ...rest } = row.values;
      return { ...row, values: rest };
    }));
  }, [columns, rows]);

  // Row handlers
  const handleAddRow = useCallback(() => {
    const newRow: ExpectedResultRow = {
      id: `row_${Date.now()}`,
      values: Object.fromEntries(columns.map((col) => [col, ''])),
    };
    setRows([...rows, newRow]);
  }, [columns, rows]);

  const handleRemoveRow = useCallback((rowId: string) => {
    setRows(rows.filter((r) => r.id !== rowId));
  }, [rows]);

  const handleCellChange = useCallback((rowId: string, col: string, value: string) => {
    setRows(rows.map((row) => 
      row.id === rowId 
        ? { ...row, values: { ...row.values, [col]: value } }
        : row
    ));
  }, [rows]);

  // Graph mapping handlers
  const handleToggleNodeLabel = useCallback((label: string) => {
    if (targetNodeLabels.includes(label)) {
      setTargetNodeLabels(targetNodeLabels.filter((l) => l !== label));
    } else {
      setTargetNodeLabels([...targetNodeLabels, label]);
    }
  }, [targetNodeLabels]);

  const handleToggleRelType = useCallback((type: string) => {
    if (targetRelTypes.includes(type)) {
      setTargetRelTypes(targetRelTypes.filter((t) => t !== type));
    } else {
      setTargetRelTypes([...targetRelTypes, type]);
    }
  }, [targetRelTypes]);

  // Context query handlers
  const handleAddContextQuery = useCallback(() => {
    const newKey = `context_${Date.now()}`;
    const newContext: ContextQueryForm = {
      key: newKey,
      name: 'New Context',
      query: '',
      description: '',
    };
    setContextQueries([...contextQueries, newContext]);
    setActiveContextTab(newKey);
    setSectionsOpen((s) => ({ ...s, context: true }));
  }, [contextQueries]);

  const handleRemoveContextQuery = useCallback((key: string) => {
    setContextQueries(contextQueries.filter((c) => c.key !== key));
    if (activeContextTab === key) {
      setActiveContextTab(contextQueries.length > 1 ? contextQueries[0].key : null);
    }
  }, [contextQueries, activeContextTab]);

  const handleContextChange = useCallback((key: string, field: keyof ContextQueryForm, value: string) => {
    setContextQueries(contextQueries.map((c) => 
      c.key === key ? { ...c, [field]: value } : c
    ));
  }, [contextQueries]);

  // Save handler
  const handleSave = useCallback(() => {
    if (!name.trim() || !queryText.trim()) return;

    // Build expected results
    let expectedResults: ExpectedResult | undefined;
    if (columns.length > 0 && rows.length > 0) {
      expectedResults = {
        columns,
        rows: rows.map((row) => {
          const values: Record<string, unknown> = {};
          columns.forEach((col) => {
            const val = row.values[col];
            // Try to parse as JSON/number
            try {
              values[col] = JSON.parse(val);
            } catch {
              values[col] = val;
            }
          });
          return values;
        }),
      };
    }

    // Build graph mapping
    let graphMapping: QueryGraphMapping | undefined;
    if (targetNodeLabels.length > 0 || targetRelTypes.length > 0) {
      graphMapping = {
        targetNodeLabels,
        targetRelationshipTypes: targetRelTypes,
      };
    }

    // Build context queries
    let contextQueriesMap: Record<string, ContextQuery> | undefined;
    if (contextQueries.length > 0) {
      contextQueriesMap = {};
      contextQueries.forEach((ctx) => {
        if (ctx.name.trim() && ctx.query.trim()) {
          contextQueriesMap![ctx.key] = {
            name: ctx.name.trim(),
            query: ctx.query.trim(),
            description: ctx.description.trim() || undefined,
          };
        }
      });
      if (Object.keys(contextQueriesMap).length === 0) {
        contextQueriesMap = undefined;
      }
    }

    const queryData = {
      name: name.trim(),
      query: queryText.trim(),
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      expectedResults,
      graphMapping,
      contextQueries: contextQueriesMap,
    };

    if (query) {
      updateQuery(query.id, queryData);
    } else {
      saveQuery(queryData);
    }

    onOpenChange(false);
  }, [
    name, queryText, description, tags, columns, rows,
    targetNodeLabels, targetRelTypes, contextQueries,
    query, saveQuery, updateQuery, onOpenChange
  ]);

  const isValid = name.trim() && queryText.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-500" />
            {query ? 'Edit Query' : 'Create New Query'}
          </DialogTitle>
          <DialogDescription>
            {query 
              ? 'Update your saved query with documentation and context queries'
              : 'Create a new query with documentation and optional context enrichments'}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Find admin users"
              />
            </div>

            {/* Main Query */}
            <div className="space-y-2">
              <Label>Cypher Query</Label>
              <div className="border rounded-lg overflow-hidden">
                <CodeMirror
                  value={queryText}
                  onChange={setQueryText}
                  extensions={[sql()]}
                  theme="dark"
                  placeholder="MATCH (n) RETURN n LIMIT 10"
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: false,
                  }}
                  className="text-sm min-h-[120px]"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddTag} disabled={!newTag.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Description */}
            <Collapsible 
              open={sectionsOpen.description} 
              onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, description: open }))}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.description ? '' : '-rotate-90'}`} />
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Description</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this query does and when to use it..."
                    rows={3}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Expected Results */}
            <Collapsible 
              open={sectionsOpen.results} 
              onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, results: open }))}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.results ? '' : '-rotate-90'}`} />
                <Table className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Expected Results</span>
                {columns.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {columns.length} cols, {rows.length} rows
                  </Badge>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 space-y-3">
                  {/* Column Management */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {columns.map((col) => (
                      <Badge key={col} variant="outline" className="gap-1 pr-1">
                        {col}
                        <button
                          type="button"
                          onClick={() => handleRemoveColumn(col)}
                          className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <div className="flex gap-1">
                      <Input
                        value={newColumn}
                        onChange={(e) => setNewColumn(e.target.value)}
                        placeholder="Column name"
                        className="w-32 h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddColumn();
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleAddColumn}
                        disabled={!newColumn.trim()}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Rows */}
                  {columns.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            {columns.map((col) => (
                              <th key={col} className="px-2 py-1.5 text-left font-medium">
                                {col}
                              </th>
                            ))}
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.id} className="border-t">
                              {columns.map((col) => (
                                <td key={col} className="px-1 py-1">
                                  <Input
                                    value={row.values[col] || ''}
                                    onChange={(e) => handleCellChange(row.id, col, e.target.value)}
                                    className="h-6 text-xs"
                                  />
                                </td>
                              ))}
                              <td className="px-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleRemoveRow(row.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="p-2 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleAddRow}
                          className="w-full gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Row
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Graph Mapping */}
            <Collapsible 
              open={sectionsOpen.mapping} 
              onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, mapping: open }))}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.mapping ? '' : '-rotate-90'}`} />
                <Network className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Graph Mapping</span>
                {(targetNodeLabels.length > 0 || targetRelTypes.length > 0) && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {targetNodeLabels.length + targetRelTypes.length} selected
                  </Badge>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 space-y-4">
                  {/* Node Labels */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Target Node Labels</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableLabels.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">
                          No labels in current graph
                        </span>
                      ) : (
                        availableLabels.map((label) => (
                          <Badge
                            key={label}
                            variant={targetNodeLabels.includes(label) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => handleToggleNodeLabel(label)}
                          >
                            :{label}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Relationship Types */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Target Relationship Types</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableRelTypes.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">
                          No relationships in current graph
                        </span>
                      ) : (
                        availableRelTypes.map((type) => (
                          <Badge
                            key={type}
                            variant={targetRelTypes.includes(type) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => handleToggleRelType(type)}
                          >
                            [{type}]
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Context Queries */}
            <Collapsible 
              open={sectionsOpen.context} 
              onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, context: open }))}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.context ? '' : '-rotate-90'}`} />
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Context Queries</span>
                {contextQueries.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {contextQueries.length}
                  </Badge>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 space-y-3">
                  {contextQueries.length > 0 && (
                    <Tabs value={activeContextTab || contextQueries[0]?.key} onValueChange={setActiveContextTab}>
                      <div className="flex items-center gap-2">
                        <TabsList variant="line" className="flex-1 justify-start overflow-x-auto">
                          {contextQueries.map((ctx) => (
                            <TabsTrigger key={ctx.key} value={ctx.key} className="text-xs">
                              {ctx.name || 'Unnamed'}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddContextQuery}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      {contextQueries.map((ctx) => (
                        <TabsContent key={ctx.key} value={ctx.key} className="space-y-3 mt-3">
                          <div className="flex items-center gap-2">
                            <Input
                              value={ctx.name}
                              onChange={(e) => handleContextChange(ctx.key, 'name', e.target.value)}
                              placeholder="Context name"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveContextQuery(ctx.key)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="border rounded-lg overflow-hidden">
                            <CodeMirror
                              value={ctx.query}
                              onChange={(val) => handleContextChange(ctx.key, 'query', val)}
                              extensions={[sql()]}
                              theme="dark"
                              placeholder="Enrichment query..."
                              basicSetup={{
                                lineNumbers: true,
                                foldGutter: false,
                              }}
                              className="text-sm min-h-[80px]"
                            />
                          </div>
                          <Textarea
                            value={ctx.description}
                            onChange={(e) => handleContextChange(ctx.key, 'description', e.target.value)}
                            placeholder="What additional data does this provide?"
                            rows={2}
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}
                  
                  {contextQueries.length === 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddContextQuery}
                      className="w-full gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Context Query
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {query ? 'Save Changes' : 'Create Query'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
