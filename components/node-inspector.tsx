'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Circle, ArrowRight, Layers, FolderTree, Trash2, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { useGraphStore, useSelectedNode, useSelectedEdge } from '@/lib/graph-store';
import type { SchemaNodeData, SchemaEdgeData } from '@/lib/arrow-parser';

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

export function NodeInspector() {
  const selectedNode = useSelectedNode();
  const selectedEdge = useSelectedEdge();
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const deleteNode = useGraphStore((state) => state.deleteNode);
  const deleteEdge = useGraphStore((state) => state.deleteEdge);
  const updateNode = useGraphStore((state) => state.updateNode);
  const updateEdge = useGraphStore((state) => state.updateEdge);
  const nodes = useGraphStore((state) => state.nodes);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Node editing state
  const [editingLabels, setEditingLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [editingProperties, setEditingProperties] = useState<{ key: string; value: string }[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  
  // Edge editing state
  const [editingRelationType, setEditingRelationType] = useState('');
  const [editingEdgeProperties, setEditingEdgeProperties] = useState<{ key: string; value: string }[]>([]);

  const isOpen = selectedNode !== null || selectedEdge !== null;

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
    if (selectedNode) {
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
    <Sheet open={isOpen} onOpenChange={(open) => !open && clearSelection()}>
      <SheetContent className="w-[400px] bg-zinc-900 border-zinc-800 p-0">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-zinc-100 flex items-center gap-2">
              {selectedNode && nodeData && (
                <>
                  {nodeData.isGroup ? (
                    <Layers className="w-4 h-4" style={{ color: nodeData.style.borderColor }} />
                  ) : (
                    <Circle className="w-4 h-4" style={{ color: selectedColor.border }} />
                  )}
                  {nodeData.isGroup ? 'Edit Group' : 'Edit Node'}
                </>
              )}
              {selectedEdge && (
                <>
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                  Edit Relationship
                </>
              )}
            </SheetTitle>
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
                onClick={clearSelection}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {/* Node Editor */}
          {selectedNode && nodeData && !nodeData.isGroup && (
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

              <Separator className="bg-zinc-800" />

              {/* Position (read-only) */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Position
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-800 rounded-lg p-2">
                    <div className="text-xs text-zinc-500 mb-1">X</div>
                    <div className="text-sm font-mono text-zinc-300">
                      {Math.round(selectedNode.position.x)}
                    </div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-2">
                    <div className="text-xs text-zinc-500 mb-1">Y</div>
                    <div className="text-sm font-mono text-zinc-300">
                      {Math.round(selectedNode.position.y)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Group Node (read-only display) */}
          {selectedNode && nodeData && nodeData.isGroup && (
            <div className="p-4 space-y-6">
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Node ID
                </h4>
                <p className="text-sm font-mono text-zinc-300 bg-zinc-800 px-3 py-2 rounded">
                  {selectedNode.id}
                </p>
              </div>

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

              {nodeData.labels.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                    Labels
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {nodeData.labels.map((label, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm"
                        style={{
                          backgroundColor: `${nodeData.style.borderColor}20`,
                          color: nodeData.style.borderColor,
                          borderColor: nodeData.style.borderColor,
                          borderWidth: '1px',
                        }}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edge Editor */}
          {selectedEdge && edgeData && (
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
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              Delete {selectedNode ? 'Node' : 'Relationship'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {selectedNode
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
    </Sheet>
  );
}
