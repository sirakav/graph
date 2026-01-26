'use client';

import { useMemo, useState } from 'react';
import {
  Layers,
  Circle,
  ArrowRight,
  Tag,
  ChevronRight,
  FileJson,
  Link2,
  Eye,
  MousePointer2,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ResizableDrawer,
  ResizableDrawerContent,
  ResizableDrawerHeader,
  ResizableDrawerTitle,
  ResizableDrawerTrigger,
} from '@/components/ui/resizable-drawer';
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
import { useGraphStore } from '@/lib/graph-store';
import type { SchemaNodeData, SchemaEdgeData } from '@/lib/arrow-parser';

interface NodeTypeSchema {
  label: string;
  count: number;
  nodeIds: string[];
  properties: Map<string, { types: Set<string>; examples: unknown[]; count: number }>;
  colors: { border: string; background: string }[];
}

interface RelationshipTypeSchema {
  type: string;
  count: number;
  edgeIds: string[];
  properties: Map<string, { types: Set<string>; examples: unknown[]; count: number }>;
  connections: { sourceLabel: string; targetLabel: string; count: number }[];
}

interface GroupedNodeTypes {
  groupId: string | null;
  label: string;
  color: string;
  nodeTypes: NodeTypeSchema[];
  totalNodes: number;
}

function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function formatExample(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    return value.length > 30 ? value.substring(0, 30) + '...' : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const str = value.slice(0, 3).join(', ');
    return value.length > 3 ? `[${str}, ...]` : `[${str}]`;
  }
  return JSON.stringify(value).substring(0, 30);
}

interface SchemaExplorerProps {
  children: React.ReactNode;
}

export function SchemaExplorer({ children }: SchemaExplorerProps) {
  const [open, setOpen] = useState(false);
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const [expandedRelTypes, setExpandedRelTypes] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const selectNodes = useGraphStore((state) => state.selectNodes);
  const openInspector = useGraphStore((state) => state.openInspector);

  // Analyze schema from current graph
  const schema = useMemo(() => {
    const nodeTypes = new Map<string, NodeTypeSchema>();
    const relationshipTypes = new Map<string, RelationshipTypeSchema>();
    const nodeIdToLabels = new Map<string, string[]>();
    const groupNodes = new Map<string, { label: string; color: string }>();
    const groupedNodeTypes = new Map<string | null, Map<string, NodeTypeSchema>>();

    nodes.forEach((node) => {
      if (node.type !== 'groupNode') return;
      const data = node.data as SchemaNodeData;
      const label = data.labels && data.labels.length > 0 ? data.labels.join(', ') : 'Group';
      const color = data.style?.borderColor || '#6b7280';
      groupNodes.set(node.id, { label, color });
    });

    const getGroupMap = (groupId: string | null) => {
      const existing = groupedNodeTypes.get(groupId);
      if (existing) return existing;
      const created = new Map<string, NodeTypeSchema>();
      groupedNodeTypes.set(groupId, created);
      return created;
    };

    // Analyze nodes
    nodes.forEach((node) => {
      if (node.type === 'groupNode') return; // Skip group nodes

      const data = node.data as SchemaNodeData;
      const labels = data.labels || [];
      const groupId = data.groupId ?? null;
      nodeIdToLabels.set(node.id, labels);

      // Handle nodes with no labels
      const effectiveLabels = labels.length > 0 ? labels : ['(unlabeled)'];

      effectiveLabels.forEach((label) => {
        let schema = nodeTypes.get(label);
        if (!schema) {
          schema = {
            label,
            count: 0,
            nodeIds: [],
            properties: new Map(),
            colors: [],
          };
          nodeTypes.set(label, schema);
        }

        schema.count++;
        schema.nodeIds.push(node.id);

        const groupMap = getGroupMap(groupId);
        let groupedSchema = groupMap.get(label);
        if (!groupedSchema) {
          groupedSchema = {
            label,
            count: 0,
            nodeIds: [],
            properties: new Map(),
            colors: [],
          };
          groupMap.set(label, groupedSchema);
        }
        groupedSchema.count++;
        groupedSchema.nodeIds.push(node.id);

        // Track colors
        if (data.style) {
          const colorExists = schema.colors.some(
            (c) => c.border === data.style.borderColor && c.background === data.style.backgroundColor
          );
          if (!colorExists) {
            schema.colors.push({
              border: data.style.borderColor,
              background: data.style.backgroundColor,
            });
          }
          const groupedColorExists = groupedSchema.colors.some(
            (c) => c.border === data.style.borderColor && c.background === data.style.backgroundColor
          );
          if (!groupedColorExists) {
            groupedSchema.colors.push({
              border: data.style.borderColor,
              background: data.style.backgroundColor,
            });
          }
        }

        // Analyze properties
        if (data.properties) {
          Object.entries(data.properties).forEach(([key, value]) => {
            let propSchema = schema!.properties.get(key);
            if (!propSchema) {
              propSchema = { types: new Set(), examples: [], count: 0 };
              schema!.properties.set(key, propSchema);
            }
            propSchema.types.add(getValueType(value));
            propSchema.count++;
            if (propSchema.examples.length < 3) {
              propSchema.examples.push(value);
            }

            let groupedPropSchema = groupedSchema!.properties.get(key);
            if (!groupedPropSchema) {
              groupedPropSchema = { types: new Set(), examples: [], count: 0 };
              groupedSchema!.properties.set(key, groupedPropSchema);
            }
            groupedPropSchema.types.add(getValueType(value));
            groupedPropSchema.count++;
            if (groupedPropSchema.examples.length < 3) {
              groupedPropSchema.examples.push(value);
            }
          });
        }
      });
    });

    // Analyze relationships
    edges.forEach((edge) => {
      const data = edge.data as SchemaEdgeData | undefined;
      const type = data?.relationshipType || '(unnamed)';

      let schema = relationshipTypes.get(type);
      if (!schema) {
        schema = {
          type,
          count: 0,
          edgeIds: [],
          properties: new Map(),
          connections: [],
        };
        relationshipTypes.set(type, schema);
      }

      schema.count++;
      schema.edgeIds.push(edge.id);

      // Track connections between labels
      const sourceLabels = nodeIdToLabels.get(edge.source) || ['(unlabeled)'];
      const targetLabels = nodeIdToLabels.get(edge.target) || ['(unlabeled)'];

      sourceLabels.forEach((sourceLabel) => {
        targetLabels.forEach((targetLabel) => {
          const existing = schema!.connections.find(
            (c) => c.sourceLabel === sourceLabel && c.targetLabel === targetLabel
          );
          if (existing) {
            existing.count++;
          } else {
            schema!.connections.push({
              sourceLabel,
              targetLabel,
              count: 1,
            });
          }
        });
      });

      // Analyze properties
      if (data?.properties) {
        Object.entries(data.properties).forEach(([key, value]) => {
          let propSchema = schema!.properties.get(key);
          if (!propSchema) {
            propSchema = { types: new Set(), examples: [], count: 0 };
            schema!.properties.set(key, propSchema);
          }
          propSchema.types.add(getValueType(value));
          propSchema.count++;
          if (propSchema.examples.length < 3) {
            propSchema.examples.push(value);
          }
        });
      }
    });

    // Sort by count
    const sortedNodeTypes = Array.from(nodeTypes.values()).sort((a, b) => b.count - a.count);
    const sortedRelTypes = Array.from(relationshipTypes.values()).sort((a, b) => b.count - a.count);
    const groupedNodeBlocks = Array.from(groupedNodeTypes.entries())
      .map(([groupId, typesMap]) => {
        const nodeTypes = Array.from(typesMap.values()).sort((a, b) => b.count - a.count);
        const totalNodes = nodeTypes.reduce((sum, nodeType) => sum + nodeType.count, 0);
        const groupMeta = groupId ? groupNodes.get(groupId) : null;
        return {
          groupId,
          label: groupMeta?.label || 'Ungrouped',
          color: groupMeta?.color || '#6b7280',
          nodeTypes,
          totalNodes,
        };
      })
      .filter((group) => group.nodeTypes.length > 0)
      .sort((a, b) => {
        if (a.groupId === null && b.groupId !== null) return 1;
        if (a.groupId !== null && b.groupId === null) return -1;
        return b.totalNodes - a.totalNodes;
      });

    return {
      nodeTypes: sortedNodeTypes,
      groupedNodeBlocks,
      hasGroups: groupNodes.size > 0,
      relationshipTypes: sortedRelTypes,
      totalNodes: nodes.filter((n) => n.type !== 'groupNode').length,
      totalEdges: edges.length,
      totalLabels: nodeTypes.size,
      totalRelTypes: relationshipTypes.size,
    };
  }, [nodes, edges]);

  const toggleLabelExpanded = (labelKey: string) => {
    const newSet = new Set(expandedLabels);
    if (newSet.has(labelKey)) {
      newSet.delete(labelKey);
    } else {
      newSet.add(labelKey);
    }
    setExpandedLabels(newSet);
  };

  const toggleRelTypeExpanded = (type: string) => {
    const newSet = new Set(expandedRelTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setExpandedRelTypes(newSet);
  };

  const toggleGroupExpanded = (groupKey: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupKey)) {
      newSet.delete(groupKey);
    } else {
      newSet.add(groupKey);
    }
    setExpandedGroups(newSet);
  };

  const handleSelectNodesByLabel = (nodeIds: string[]) => {
    selectNodes(nodeIds);
    setOpen(false);
  };

  const handleSelectAndInspect = (nodeIds: string[]) => {
    if (nodeIds.length > 0) {
      selectNodes([nodeIds[0]]);
      openInspector();
      setOpen(false);
    }
  };

  const renderNodeTypeList = (nodeTypes: NodeTypeSchema[], groupKey?: string) => {
    if (nodeTypes.length === 0) {
      return <p className="text-xs text-zinc-500 italic">No nodes in group</p>;
    }

    return (
      <div className="space-y-2">
        {nodeTypes.map((nodeType) => {
          const labelKey = groupKey ? `${groupKey}::${nodeType.label}` : nodeType.label;
          return (
          <Collapsible
            key={labelKey}
            open={expandedLabels.has(labelKey)}
            onOpenChange={() => toggleLabelExpanded(labelKey)}
          >
            <div className="rounded-lg border border-zinc-700/50 overflow-hidden bg-zinc-800/30">
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 hover:bg-zinc-800/50 transition-colors text-left">
                <ChevronRight
                  className={`w-3.5 h-3.5 text-zinc-500 transition-transform shrink-0 ${
                    expandedLabels.has(labelKey) ? 'rotate-90' : ''
                  }`}
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  {nodeType.colors.slice(0, 3).map((color, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full border"
                      style={{
                        backgroundColor: color.background,
                        borderColor: color.border,
                      }}
                    />
                  ))}
                  {nodeType.colors.length > 3 && (
                    <span className="text-[10px] text-zinc-500">
                      +{nodeType.colors.length - 3}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-zinc-200 truncate flex-1">
                  {nodeType.label}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 border-blue-500/30 text-blue-400 shrink-0"
                >
                  {nodeType.count}
                </Badge>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-zinc-700/50 p-3 space-y-3">
                  {/* Properties */}
                  {nodeType.properties.size > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                        <FileJson className="w-3 h-3" />
                        Properties ({nodeType.properties.size})
                      </div>
                      <div className="space-y-1.5 bg-zinc-900/50 rounded-md p-2">
                        {Array.from(nodeType.properties.entries()).map(([key, propSchema]) => (
                          <div key={key} className="flex items-start gap-2 text-[11px]">
                            <span className="text-zinc-300 font-mono shrink-0">{key}</span>
                            <span className="text-zinc-500">:</span>
                            <span className="text-amber-400/80 font-mono">
                              {Array.from(propSchema.types).join(' | ')}
                            </span>
                            {propSchema.examples.length > 0 && (
                              <span className="text-zinc-600 truncate ml-auto">
                                e.g. {formatExample(propSchema.examples[0])}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {nodeType.properties.size === 0 && (
                    <p className="text-xs text-zinc-500 italic">No properties defined</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-7 text-xs flex-1"
                          onClick={() => handleSelectNodesByLabel(nodeType.nodeIds)}
                        >
                          <MousePointer2 className="w-3 h-3" />
                          Select All ({nodeType.count})
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Select all nodes with this label</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 h-7 text-xs"
                          onClick={() => handleSelectAndInspect(nodeType.nodeIds)}
                        >
                          <Eye className="w-3 h-3" />
                          Inspect
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Inspect first node of this type</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
          );
        })}
      </div>
    );
  };

  return (
    <ResizableDrawer open={open} onOpenChange={setOpen}>
      <ResizableDrawerTrigger asChild>{children}</ResizableDrawerTrigger>
      <ResizableDrawerContent
        className="bg-zinc-900 border-zinc-800 p-0"
        defaultWidth={480}
        minWidth={360}
        maxWidth={700}
        showCloseButton={false}
      >
        <ResizableDrawerHeader className="p-4 pb-3 border-b border-zinc-800">
          <ResizableDrawerTitle className="text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Schema Explorer
          </ResizableDrawerTitle>
          <p className="text-xs text-zinc-500 mt-1">
            Explore your graph schema structure and navigate to specific node types.
          </p>
        </ResizableDrawerHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-4 space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Circle className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-medium">Nodes</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-zinc-100">{schema.totalNodes}</span>
                  <span className="text-xs text-zinc-500">
                    in {schema.totalLabels} {schema.totalLabels === 1 ? 'type' : 'types'}
                  </span>
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-medium">
                    Relationships
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-zinc-100">{schema.totalEdges}</span>
                  <span className="text-xs text-zinc-500">
                    in {schema.totalRelTypes} {schema.totalRelTypes === 1 ? 'type' : 'types'}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Node Types */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-medium text-zinc-200">Node Types</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto">
                  {schema.nodeTypes.length}
                </Badge>
              </div>

              {schema.totalNodes === 0 ? (
                <p className="text-sm text-zinc-500 italic py-4 text-center">No nodes in graph</p>
              ) : schema.hasGroups ? (
                <div className="space-y-3">
                  {schema.groupedNodeBlocks.map((group) => {
                    const groupKey = group.groupId || 'ungrouped';
                    return (
                      <Collapsible
                        key={groupKey}
                        open={expandedGroups.has(groupKey)}
                        onOpenChange={() => toggleGroupExpanded(groupKey)}
                      >
                        <div className="rounded-lg border border-zinc-700/50 overflow-hidden bg-zinc-900/30">
                          <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700/50 bg-zinc-800/40 w-full text-left">
                            <ChevronRight
                              className={`w-3.5 h-3.5 text-zinc-500 transition-transform shrink-0 ${
                                expandedGroups.has(groupKey) ? 'rotate-90' : ''
                              }`}
                            />
                            <Layers className="w-4 h-4" style={{ color: group.color }} />
                            <span className="text-sm font-medium text-zinc-200 truncate flex-1">
                              {group.label}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-5 border-zinc-600/60 text-zinc-300 shrink-0"
                            >
                              {group.totalNodes}
                            </Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-3">
                              {renderNodeTypeList(group.nodeTypes, groupKey)}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              ) : (
                renderNodeTypeList(schema.nodeTypes)
              )}
            </div>

            <Separator className="bg-zinc-800" />

            {/* Relationship Types */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-medium text-zinc-200">Relationship Types</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto">
                  {schema.relationshipTypes.length}
                </Badge>
              </div>

              {schema.relationshipTypes.length === 0 ? (
                <p className="text-sm text-zinc-500 italic py-4 text-center">
                  No relationships in graph
                </p>
              ) : (
                <div className="space-y-2">
                  {schema.relationshipTypes.map((relType) => (
                    <Collapsible
                      key={relType.type}
                      open={expandedRelTypes.has(relType.type)}
                      onOpenChange={() => toggleRelTypeExpanded(relType.type)}
                    >
                      <div className="rounded-lg border border-zinc-700/50 overflow-hidden bg-zinc-800/30">
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 hover:bg-zinc-800/50 transition-colors text-left">
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-zinc-500 transition-transform shrink-0 ${
                              expandedRelTypes.has(relType.type) ? 'rotate-90' : ''
                            }`}
                          />
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
                          <span className="text-sm font-mono text-zinc-200 truncate flex-1">
                            {relType.type}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-5 border-emerald-500/30 text-emerald-400 shrink-0"
                          >
                            {relType.count}
                          </Badge>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border-t border-zinc-700/50 p-3 space-y-3">
                            {/* Connection patterns */}
                            <div>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                                <BarChart3 className="w-3 h-3" />
                                Connection Patterns
                              </div>
                              <div className="space-y-1.5">
                                {relType.connections
                                  .sort((a, b) => b.count - a.count)
                                  .slice(0, 5)
                                  .map((conn, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-2 text-[11px] bg-zinc-900/50 rounded px-2 py-1.5"
                                    >
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4 border-blue-500/30 text-blue-400"
                                      >
                                        {conn.sourceLabel}
                                      </Badge>
                                      <ArrowRight className="w-3 h-3 text-zinc-600" />
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4 border-blue-500/30 text-blue-400"
                                      >
                                        {conn.targetLabel}
                                      </Badge>
                                      <span className="text-zinc-500 ml-auto">×{conn.count}</span>
                                    </div>
                                  ))}
                                {relType.connections.length > 5 && (
                                  <p className="text-[10px] text-zinc-500 pl-2">
                                    +{relType.connections.length - 5} more patterns
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Properties */}
                            {relType.properties.size > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                                  <FileJson className="w-3 h-3" />
                                  Properties ({relType.properties.size})
                                </div>
                                <div className="space-y-1.5 bg-zinc-900/50 rounded-md p-2">
                                  {Array.from(relType.properties.entries()).map(
                                    ([key, propSchema]) => (
                                      <div
                                        key={key}
                                        className="flex items-start gap-2 text-[11px]"
                                      >
                                        <span className="text-zinc-300 font-mono shrink-0">
                                          {key}
                                        </span>
                                        <span className="text-zinc-500">:</span>
                                        <span className="text-amber-400/80 font-mono">
                                          {Array.from(propSchema.types).join(' | ')}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}
            </div>

            {/* Empty state */}
            {schema.totalNodes === 0 && schema.totalEdges === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="w-12 h-12 text-zinc-700 mb-4" />
                <h3 className="text-sm font-medium text-zinc-400 mb-1">No Schema Data</h3>
                <p className="text-xs text-zinc-500 max-w-[240px]">
                  Load a graph to explore its schema structure, node types, and relationships.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </ResizableDrawerContent>
    </ResizableDrawer>
  );
}
