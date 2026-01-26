'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Circle, ArrowRight, ArrowLeft, Layers, Trash2, Plus, Link2, ChevronRight, Network, ChevronDown, Tag, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ResizableDrawer,
  ResizableDrawerContent,
  ResizableDrawerHeader,
  ResizableDrawerTitle,
} from '@/components/ui/resizable-drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useGraphStore, useSelectedNode, useSelectedEdge, useSelectedNodeIds, useSelectedNodes, useInspectorOpen } from '@/lib/graph-store';
import type { SchemaNodeData, SchemaEdgeData, SchemaEdge, GraphNode } from '@/lib/arrow-parser';

const COLOR_PRESETS = [
  { border: '#4C8EDA', bg: '#4C8EDA20', name: 'Blue' },
  { border: '#DA4C4C', bg: '#DA4C4C20', name: 'Red' },
  { border: '#4CDA7B', bg: '#4CDA7B20', name: 'Green' },
  { border: '#DA9A4C', bg: '#DA9A4C20', name: 'Orange' },
  { border: '#9A4CDA', bg: '#9A4CDA20', name: 'Purple' },
  { border: '#4CDADA', bg: '#4CDADA20', name: 'Cyan' },
  { border: '#DA4C9A', bg: '#DA4C9A20', name: 'Pink' },
  { border: '#9ADA4C', bg: '#9ADA4C20', name: 'Lime' },
];

// Helper function to format property values for display
function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  return JSON.stringify(value);
}

// Component for displaying related node data in an expandable card
interface RelatedNodeCardProps {
  nodeId: string;
  nodeData: SchemaNodeData | undefined;
  edgeProperties: Record<string, unknown>;
  hasEdgeProps: boolean;
  hasNodeProps: boolean;
  direction: 'incoming' | 'outgoing';
  onNavigate: () => void;
}

function RelatedNodeCard({
  nodeId,
  nodeData,
  edgeProperties,
  hasEdgeProps,
  hasNodeProps,
  direction,
  onNavigate,
}: RelatedNodeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const nodeLabels = nodeData?.labels || [];
  const nodeProperties = nodeData?.properties || {};
  const borderColor = nodeData?.style?.borderColor || '#4C8EDA';
  
  return (
    <div className="rounded-lg border border-zinc-700/50 overflow-hidden bg-zinc-800/30">
      {/* Header - clickable to expand/collapse */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="flex items-center gap-2 w-full p-2.5 hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
      >
        <ChevronDown 
          className={`w-3 h-3 text-zinc-500 transition-transform shrink-0 ${isExpanded ? '' : '-rotate-90'}`} 
        />
        {direction === 'outgoing' ? (
          <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />
        ) : (
          <ArrowLeft className="w-3 h-3 text-zinc-600 shrink-0" />
        )}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: borderColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-zinc-200 truncate">
              {nodeLabels[0] || nodeId}
            </span>
            {(hasNodeProps || hasEdgeProps) && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-zinc-700/50">
                {Object.keys(nodeProperties).length + Object.keys(edgeProperties).length} props
              </Badge>
            )}
          </div>
          {nodeLabels[0] && (
            <span className="text-[10px] text-zinc-500 font-mono truncate block">
              {nodeId}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-zinc-500 hover:text-zinc-200"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          title="Navigate to node"
        >
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Expanded content - Related node data */}
      {isExpanded && (
        <div className="border-t border-zinc-700/50 p-3 space-y-3">
          {/* Labels */}
          {nodeLabels.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
                <Tag className="w-3 h-3" />
                Labels
              </div>
              <div className="flex flex-wrap gap-1.5">
                {nodeLabels.map((label, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5"
                    style={{
                      borderColor: `${borderColor}50`,
                      color: borderColor,
                      backgroundColor: `${borderColor}10`,
                    }}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Node Properties */}
          {hasNodeProps && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
                <FileJson className="w-3 h-3" />
                Node Properties
              </div>
              <div className="space-y-1 bg-zinc-900/50 rounded-md p-2">
                {Object.entries(nodeProperties).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-[11px]">
                    <span className="text-zinc-400 font-medium shrink-0">{key}:</span>
                    <span className="text-zinc-300 break-all">{formatPropertyValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edge Properties */}
          {hasEdgeProps && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
                <Link2 className="w-3 h-3" />
                Relationship Properties
              </div>
              <div className="space-y-1 bg-zinc-900/50 rounded-md p-2">
                {Object.entries(edgeProperties).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-[11px]">
                    <span className="text-zinc-400 font-medium shrink-0">{key}:</span>
                    <span className="text-zinc-300 break-all">{formatPropertyValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasNodeProps && !hasEdgeProps && nodeLabels.length === 0 && (
            <p className="text-xs text-zinc-500 italic">No additional data</p>
          )}
        </div>
      )}
    </div>
  );
}

export function NodeInspector() {
  const selectedNode = useSelectedNode();
  const selectedEdge = useSelectedEdge();
  const selectedNodeIds = useSelectedNodeIds();
  const selectedNodes = useSelectedNodes();
  const inspectorOpen = useInspectorOpen();
  const closeInspector = useGraphStore((state) => state.closeInspector);
  const deleteNode = useGraphStore((state) => state.deleteNode);
  const deleteSelectedNodes = useGraphStore((state) => state.deleteSelectedNodes);
  const deleteEdge = useGraphStore((state) => state.deleteEdge);
  const updateNode = useGraphStore((state) => state.updateNode);
  const updateEdge = useGraphStore((state) => state.updateEdge);
  const nodes = useGraphStore((state) => state.nodes);
  
  // Multi-selection state
  const isMultiSelection = selectedNodeIds.length > 1;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Node editing state
  const [editingLabels, setEditingLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [editingProperties, setEditingProperties] = useState<{ key: string; value: string }[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  
  // Edge editing state
  const [editingRelationType, setEditingRelationType] = useState('');
  const [editingEdgeProperties, setEditingEdgeProperties] = useState<{ key: string; value: string }[]>([]);
  
  // Connections panel state
  const [outgoingOpen, setOutgoingOpen] = useState(true);
  const [incomingOpen, setIncomingOpen] = useState(true);

  // Drawer only opens when inspectorOpen is true AND there's something selected
  // This is controlled via double-click, not automatic on selection
  const hasSelection = selectedNode !== null || selectedEdge !== null || isMultiSelection;
  const isOpen = inspectorOpen && hasSelection;
  
  // Get all edges from store
  const edges = useGraphStore((state) => state.edges);
  const selectEdge = useGraphStore((state) => state.selectEdge);
  const selectNode = useGraphStore((state) => state.selectNode);
  
  // Compute connected relationships for the selected node
  const connectedRelationships = useMemo(() => {
    if (!selectedNode) return { outgoing: [], incoming: [] };
    
    const outgoing: Array<{
      edge: SchemaEdge;
      targetNode: GraphNode | undefined;
      relationshipType: string;
    }> = [];
    
    const incoming: Array<{
      edge: SchemaEdge;
      sourceNode: GraphNode | undefined;
      relationshipType: string;
    }> = [];
    
    edges.forEach((edge) => {
      const edgeData = edge.data as SchemaEdgeData | undefined;
      const relType = edgeData?.relationshipType || 'RELATES_TO';
      
      if (edge.source === selectedNode.id) {
        outgoing.push({
          edge,
          targetNode: nodes.find((n) => n.id === edge.target),
          relationshipType: relType,
        });
      }
      
      if (edge.target === selectedNode.id) {
        incoming.push({
          edge,
          sourceNode: nodes.find((n) => n.id === edge.source),
          relationshipType: relType,
        });
      }
    });
    
    return { outgoing, incoming };
  }, [selectedNode, edges, nodes]);
  
  // Group relationships by type for better visualization
  const groupedRelationships = useMemo(() => {
    const outgoingByType = new Map<string, typeof connectedRelationships.outgoing>();
    const incomingByType = new Map<string, typeof connectedRelationships.incoming>();
    
    connectedRelationships.outgoing.forEach((rel) => {
      const existing = outgoingByType.get(rel.relationshipType) || [];
      existing.push(rel);
      outgoingByType.set(rel.relationshipType, existing);
    });
    
    connectedRelationships.incoming.forEach((rel) => {
      const existing = incomingByType.get(rel.relationshipType) || [];
      existing.push(rel);
      incomingByType.set(rel.relationshipType, existing);
    });
    
    return { outgoingByType, incomingByType };
  }, [connectedRelationships]);

  // Get connected nodes for edge
  const sourceNode = selectedEdge
    ? nodes.find((n) => n.id === selectedEdge.source)
    : null;
  const targetNode = selectedEdge
    ? nodes.find((n) => n.id === selectedEdge.target)
    : null;

  const nodeData = selectedNode?.data as SchemaNodeData | undefined;
  const edgeData = selectedEdge?.data as SchemaEdgeData | undefined;
  const sourceNodeData = sourceNode?.data as SchemaNodeData | undefined;
  const targetNodeData = targetNode?.data as SchemaNodeData | undefined;

  // Sync editing state when selection changes
  useEffect(() => {
    if (selectedNode && nodeData) {
      setEditingLabels(nodeData.labels || []);
      setEditingProperties(
        Object.entries(nodeData.properties || {}).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
        }))
      );
      const matchingColor = COLOR_PRESETS.find(
        (c) => c.border === nodeData.style?.borderColor
      );
      setSelectedColor(matchingColor || COLOR_PRESETS[0]);
    }
  }, [selectedNode?.id, nodeData]);

  useEffect(() => {
    if (selectedEdge && edgeData) {
      setEditingRelationType(edgeData.relationshipType || '');
      setEditingEdgeProperties(
        Object.entries(edgeData.properties || {}).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
        }))
      );
    }
  }, [selectedEdge?.id, edgeData]);

  const handleDelete = () => {
    if (isMultiSelection) {
      deleteSelectedNodes();
    } else if (selectedNode) {
      deleteNode(selectedNode.id);
    } else if (selectedEdge) {
      deleteEdge(selectedEdge.id);
    }
    setDeleteDialogOpen(false);
  };

  // Node editing handlers
  const handleAddLabel = useCallback(() => {
    const trimmed = newLabel.trim();
    if (trimmed && !editingLabels.includes(trimmed)) {
      const newLabels = [...editingLabels, trimmed];
      setEditingLabels(newLabels);
      setNewLabel('');
      if (selectedNode) {
        updateNode(selectedNode.id, { labels: newLabels });
      }
    }
  }, [newLabel, editingLabels, selectedNode, updateNode]);

  const handleRemoveLabel = useCallback((index: number) => {
    const newLabels = editingLabels.filter((_, i) => i !== index);
    setEditingLabels(newLabels);
    if (selectedNode) {
      updateNode(selectedNode.id, { labels: newLabels });
    }
  }, [editingLabels, selectedNode, updateNode]);

  const handleAddProperty = useCallback(() => {
    setEditingProperties([...editingProperties, { key: '', value: '' }]);
  }, [editingProperties]);

  const handleRemoveProperty = useCallback((index: number) => {
    const newProps = editingProperties.filter((_, i) => i !== index);
    setEditingProperties(newProps);
    if (selectedNode) {
      const propsObject: Record<string, unknown> = {};
      newProps.forEach(({ key, value }) => {
        if (key.trim()) {
          try {
            propsObject[key.trim()] = JSON.parse(value);
          } catch {
            propsObject[key.trim()] = value;
          }
        }
      });
      updateNode(selectedNode.id, { properties: propsObject });
    }
  }, [editingProperties, selectedNode, updateNode]);

  const handlePropertyChange = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      const newProps = editingProperties.map((prop, i) =>
        i === index ? { ...prop, [field]: value } : prop
      );
      setEditingProperties(newProps);
    },
    [editingProperties]
  );

  const handleSaveProperties = useCallback(() => {
    if (selectedNode) {
      const propsObject: Record<string, unknown> = {};
      editingProperties.forEach(({ key, value }) => {
        if (key.trim()) {
          try {
            propsObject[key.trim()] = JSON.parse(value);
          } catch {
            propsObject[key.trim()] = value;
          }
        }
      });
      updateNode(selectedNode.id, { properties: propsObject });
    }
  }, [editingProperties, selectedNode, updateNode]);

  const handleColorChange = useCallback((color: typeof COLOR_PRESETS[0]) => {
    setSelectedColor(color);
    if (selectedNode) {
      updateNode(selectedNode.id, {
        style: { borderColor: color.border, backgroundColor: color.bg },
      });
    }
  }, [selectedNode, updateNode]);

  // Edge editing handlers
  const handleRelationTypeChange = useCallback((value: string) => {
    const formatted = value.toUpperCase().replace(/\s+/g, '_');
    setEditingRelationType(formatted);
  }, []);

  const handleSaveRelationType = useCallback(() => {
    if (selectedEdge && editingRelationType.trim()) {
      updateEdge(selectedEdge.id, { relationshipType: editingRelationType.trim() });
    }
  }, [selectedEdge, editingRelationType, updateEdge]);

  const handleAddEdgeProperty = useCallback(() => {
    setEditingEdgeProperties([...editingEdgeProperties, { key: '', value: '' }]);
  }, [editingEdgeProperties]);

  const handleRemoveEdgeProperty = useCallback((index: number) => {
    const newProps = editingEdgeProperties.filter((_, i) => i !== index);
    setEditingEdgeProperties(newProps);
    if (selectedEdge) {
      const propsObject: Record<string, unknown> = {};
      newProps.forEach(({ key, value }) => {
        if (key.trim()) {
          try {
            propsObject[key.trim()] = JSON.parse(value);
          } catch {
            propsObject[key.trim()] = value;
          }
        }
      });
      updateEdge(selectedEdge.id, { properties: propsObject });
    }
  }, [editingEdgeProperties, selectedEdge, updateEdge]);

  const handleEdgePropertyChange = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      const newProps = editingEdgeProperties.map((prop, i) =>
        i === index ? { ...prop, [field]: value } : prop
      );
      setEditingEdgeProperties(newProps);
    },
    [editingEdgeProperties]
  );

  const handleSaveEdgeProperties = useCallback(() => {
    if (selectedEdge) {
      const propsObject: Record<string, unknown> = {};
      editingEdgeProperties.forEach(({ key, value }) => {
        if (key.trim()) {
          try {
            propsObject[key.trim()] = JSON.parse(value);
          } catch {
            propsObject[key.trim()] = value;
          }
        }
      });
      updateEdge(selectedEdge.id, { properties: propsObject });
    }
  }, [editingEdgeProperties, selectedEdge, updateEdge]);

  return (
    <ResizableDrawer open={isOpen} onOpenChange={(open) => !open && closeInspector()}>
      <ResizableDrawerContent 
        className="bg-zinc-900 border-zinc-800 p-0"
        defaultWidth={400}
        minWidth={300}
        maxWidth={800}
        showCloseButton={false}
      >
        <ResizableDrawerHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <ResizableDrawerTitle className="text-zinc-100 flex items-center gap-2">
              {isMultiSelection && (
                <>
                  <Circle className="w-4 h-4 text-blue-400" />
                  {selectedNodeIds.length} Nodes Selected
                </>
              )}
              {!isMultiSelection && selectedNode && nodeData && (
                <>
                  {nodeData.isGroup ? (
                    <Layers className="w-4 h-4" style={{ color: nodeData.style.borderColor }} />
                  ) : (
                    <Circle className="w-4 h-4" style={{ color: selectedColor.border }} />
                  )}
                  {nodeData.isGroup ? 'Edit Group' : 'Edit Node'}
                </>
              )}
              {!isMultiSelection && selectedEdge && (
                <>
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                  Edit Relationship
                </>
              )}
            </ResizableDrawerTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
                className="h-8 w-8 text-zinc-400 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={closeInspector}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </ResizableDrawerHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {/* Multi-Selection View */}
          {isMultiSelection && (
            <div className="p-4 space-y-6">
              {/* Selected Nodes List */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Selected Nodes
                </h4>
                <div className="space-y-2">
                  {selectedNodes.map((node) => {
                    const data = node.data as SchemaNodeData;
                    return (
                      <div
                        key={node.id}
                        className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: data?.style?.borderColor || '#4C8EDA' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-200 truncate">
                            {data?.labels?.[0] || 'Unlabeled'}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono truncate">
                            {node.id}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Bulk Actions */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Bulk Actions
                </h4>
                <div className="space-y-2">
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete {selectedNodeIds.length} Nodes
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Tip: Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-[10px]">Delete</kbd> or <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-[10px]">Backspace</kbd> to delete selected nodes
                </p>
              </div>
            </div>
          )}

          {/* Node Editor */}
          {!isMultiSelection && selectedNode && nodeData && !nodeData.isGroup && (
            <div className="p-4 space-y-6">
              {/* Node ID (read-only) */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Node ID
                </h4>
                <p className="text-sm font-mono text-zinc-400 bg-zinc-800 px-3 py-2 rounded">
                  {selectedNode.id}
                </p>
              </div>

              {/* Color Selection */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Color
                </h4>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.border}
                      type="button"
                      onClick={() => handleColorChange(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        selectedColor.border === color.border
                          ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white/50 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: color.bg,
                        borderColor: color.border,
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Labels */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Labels
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editingLabels.map((label, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-sm gap-1 pr-1"
                      style={{
                        backgroundColor: `${selectedColor.border}20`,
                        color: selectedColor.border,
                        borderColor: selectedColor.border,
                        borderWidth: '1px',
                      }}
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(index)}
                        className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {editingLabels.length === 0 && (
                    <span className="text-sm text-zinc-500 italic">No labels</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Add label..."
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLabel();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddLabel}
                    disabled={!newLabel.trim()}
                    className="shrink-0 h-8 w-8"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Properties */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Properties
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddProperty}
                    className="gap-1 h-7 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {editingProperties.map((prop, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <Input
                        value={prop.key}
                        onChange={(e) => handlePropertyChange(index, 'key', e.target.value)}
                        placeholder="Key"
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 flex-1 h-8 text-sm"
                        onBlur={handleSaveProperties}
                      />
                      <Input
                        value={prop.value}
                        onChange={(e) => handlePropertyChange(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 flex-1 h-8 text-sm"
                        onBlur={handleSaveProperties}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProperty(index)}
                        className="shrink-0 text-zinc-500 hover:text-red-400 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {editingProperties.length === 0 && (
                    <p className="text-sm text-zinc-500 italic">No properties</p>
                  )}
                </div>
              </div>

              {/* Connections Section with Related Node Data */}
              {(connectedRelationships.outgoing.length > 0 || connectedRelationships.incoming.length > 0) && (
                <>
                  <Separator className="bg-zinc-800" />
                  
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Network className="w-4 h-4 text-zinc-400" />
                      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Connections & Related Data
                      </h4>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {connectedRelationships.outgoing.length + connectedRelationships.incoming.length}
                      </Badge>
                    </div>

                    {/* Outgoing Relationships */}
                    {connectedRelationships.outgoing.length > 0 && (
                      <Collapsible open={outgoingOpen} onOpenChange={setOutgoingOpen} className="mb-3">
                        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
                          <ChevronRight className={`w-3 h-3 text-zinc-500 transition-transform ${outgoingOpen ? 'rotate-90' : ''}`} />
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-medium text-zinc-300">Outgoing</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-400">
                            {connectedRelationships.outgoing.length}
                          </Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2 pl-5">
                          {Array.from(groupedRelationships.outgoingByType.entries()).map(([relType, rels]) => (
                            <div key={relType} className="space-y-2">
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider">
                                <Link2 className="w-3 h-3" />
                                {relType}
                              </div>
                              {rels.map((rel) => {
                                const targetData = rel.targetNode?.data as SchemaNodeData | undefined;
                                const edgeData = rel.edge.data as SchemaEdgeData | undefined;
                                const edgeProperties = edgeData?.properties || {};
                                const hasEdgeProps = Object.keys(edgeProperties).length > 0;
                                const targetProperties = targetData?.properties || {};
                                const hasTargetProps = Object.keys(targetProperties).length > 0;
                                
                                return (
                                  <RelatedNodeCard
                                    key={rel.edge.id}
                                    nodeId={rel.edge.target}
                                    nodeData={targetData}
                                    edgeProperties={edgeProperties}
                                    hasEdgeProps={hasEdgeProps}
                                    hasNodeProps={hasTargetProps}
                                    direction="outgoing"
                                    onNavigate={() => selectNode(rel.edge.target)}
                                  />
                                );
                              })}
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Incoming Relationships */}
                    {connectedRelationships.incoming.length > 0 && (
                      <Collapsible open={incomingOpen} onOpenChange={setIncomingOpen}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
                          <ChevronRight className={`w-3 h-3 text-zinc-500 transition-transform ${incomingOpen ? 'rotate-90' : ''}`} />
                          <ArrowLeft className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-zinc-300">Incoming</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-400">
                            {connectedRelationships.incoming.length}
                          </Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2 pl-5">
                          {Array.from(groupedRelationships.incomingByType.entries()).map(([relType, rels]) => (
                            <div key={relType} className="space-y-2">
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider">
                                <Link2 className="w-3 h-3" />
                                {relType}
                              </div>
                              {rels.map((rel) => {
                                const sourceData = rel.sourceNode?.data as SchemaNodeData | undefined;
                                const edgeData = rel.edge.data as SchemaEdgeData | undefined;
                                const edgeProperties = edgeData?.properties || {};
                                const hasEdgeProps = Object.keys(edgeProperties).length > 0;
                                const sourceProperties = sourceData?.properties || {};
                                const hasSourceProps = Object.keys(sourceProperties).length > 0;
                                
                                return (
                                  <RelatedNodeCard
                                    key={rel.edge.id}
                                    nodeId={rel.edge.source}
                                    nodeData={sourceData}
                                    edgeProperties={edgeProperties}
                                    hasEdgeProps={hasEdgeProps}
                                    hasNodeProps={hasSourceProps}
                                    direction="incoming"
                                    onNavigate={() => selectNode(rel.edge.source)}
                                  />
                                );
                              })}
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </>
              )}

              {/* No connections message */}
              {connectedRelationships.outgoing.length === 0 && connectedRelationships.incoming.length === 0 && (
                <>
                  <Separator className="bg-zinc-800" />
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Network className="w-4 h-4" />
                    <span className="text-xs">No connections</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Group Node Editor */}
          {!isMultiSelection && selectedNode && nodeData && nodeData.isGroup && (
            <div className="p-4 space-y-6">
              {/* Node ID (read-only) */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Group ID
                </h4>
                <p className="text-sm font-mono text-zinc-400 bg-zinc-800 px-3 py-2 rounded">
                  {selectedNode.id}
                </p>
              </div>

              {/* Group Info */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Group Info
                </h4>
                <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-3">
                  <Layers className="w-4 h-4" style={{ color: nodeData.style.borderColor }} />
                  <div>
                    <div className="text-xs text-zinc-500">This is a group container</div>
                    <div className="text-sm text-zinc-200">
                      {nodeData.childNodeIds?.length || 0} contained {(nodeData.childNodeIds?.length || 0) === 1 ? 'node' : 'nodes'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Color
                </h4>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.border}
                      type="button"
                      onClick={() => handleColorChange(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        selectedColor.border === color.border
                          ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white/50 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: color.bg,
                        borderColor: color.border,
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Group Name / Labels */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Group Name
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editingLabels.map((label, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-sm gap-1 pr-1"
                      style={{
                        backgroundColor: `${selectedColor.border}20`,
                        color: selectedColor.border,
                        borderColor: selectedColor.border,
                        borderWidth: '1px',
                      }}
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(index)}
                        className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {editingLabels.length === 0 && (
                    <span className="text-sm text-zinc-500 italic">No name</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Add group name..."
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLabel();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddLabel}
                    disabled={!newLabel.trim()}
                    className="shrink-0 h-8 w-8"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Properties */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Properties
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddProperty}
                    className="gap-1 h-7 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {editingProperties.map((prop, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <Input
                        value={prop.key}
                        onChange={(e) => handlePropertyChange(index, 'key', e.target.value)}
                        placeholder="Key"
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 flex-1 h-8 text-sm"
                        onBlur={handleSaveProperties}
                      />
                      <Input
                        value={prop.value}
                        onChange={(e) => handlePropertyChange(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 flex-1 h-8 text-sm"
                        onBlur={handleSaveProperties}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProperty(index)}
                        className="shrink-0 text-zinc-500 hover:text-red-400 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {editingProperties.length === 0 && (
                    <p className="text-sm text-zinc-500 italic">No properties</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edge Editor */}
          {!isMultiSelection && selectedEdge && edgeData && (
            <div className="p-4 space-y-6">
              {/* Connection Visual */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Connection
                </h4>
                <div className="space-y-3">
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-1">Source</div>
                    <div className="flex items-center gap-2">
                      {sourceNodeData && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: sourceNodeData.style.borderColor }}
                        />
                      )}
                      <span className="text-sm font-mono text-zinc-200">
                        {selectedEdge.source}
                      </span>
                      {sourceNodeData?.labels[0] && (
                        <Badge variant="outline" className="text-xs">
                          {sourceNodeData.labels[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-1">Target</div>
                    <div className="flex items-center gap-2">
                      {targetNodeData && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: targetNodeData.style.borderColor }}
                        />
                      )}
                      <span className="text-sm font-mono text-zinc-200">
                        {selectedEdge.target}
                      </span>
                      {targetNodeData?.labels[0] && (
                        <Badge variant="outline" className="text-xs">
                          {targetNodeData.labels[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Relationship Type */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Relationship Type
                </h4>
                <div className="flex gap-2">
                  <Input
                    value={editingRelationType}
                    onChange={(e) => handleRelationTypeChange(e.target.value)}
                    placeholder="RELATES_TO"
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 font-mono h-8 text-sm"
                    onBlur={handleSaveRelationType}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveRelationType();
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Use UPPERCASE_WITH_UNDERSCORES
                </p>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Properties */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Properties
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddEdgeProperty}
                    className="gap-1 h-7 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {editingEdgeProperties.map((prop, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <Input
                        value={prop.key}
                        onChange={(e) => handleEdgePropertyChange(index, 'key', e.target.value)}
                        placeholder="Key"
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 flex-1 h-8 text-sm"
                        onBlur={handleSaveEdgeProperties}
                      />
                      <Input
                        value={prop.value}
                        onChange={(e) => handleEdgePropertyChange(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="bg-zinc-800 border-zinc-700 text-zinc-200 flex-1 h-8 text-sm"
                        onBlur={handleSaveEdgeProperties}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEdgeProperty(index)}
                        className="shrink-0 text-zinc-500 hover:text-red-400 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {editingEdgeProperties.length === 0 && (
                    <p className="text-sm text-zinc-500 italic">No properties</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </ResizableDrawerContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              {isMultiSelection 
                ? `Delete ${selectedNodeIds.length} Nodes?`
                : selectedNode 
                  ? 'Delete Node?' 
                  : 'Delete Relationship?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {isMultiSelection
                ? `This will delete ${selectedNodeIds.length} nodes and all their connected relationships. This action cannot be undone.`
                : selectedNode
                  ? 'This will delete the node and all its connected relationships. This action cannot be undone.'
                  : 'This will delete the relationship. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResizableDrawer>
  );
}
