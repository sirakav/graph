'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Circle, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGraphStore } from '@/lib/graph-store';
import type { SchemaNodeData } from '@/lib/arrow-parser';

interface NodeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId?: string | null; // If provided, we're editing an existing node
}

interface NodeTypeSuggestion {
  labels: string[];
  properties: string[];
  color: { border: string; bg: string; name: string };
  count: number;
}

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

export function NodeEditorDialog({ open, onOpenChange, nodeId }: NodeEditorDialogProps) {
  const nodes = useGraphStore((state) => state.nodes);
  const addNode = useGraphStore((state) => state.addNode);
  const updateNode = useGraphStore((state) => state.updateNode);

  const existingNode = nodeId ? nodes.find((n) => n.id === nodeId) : null;
  const existingData = existingNode?.data as SchemaNodeData | undefined;

  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [properties, setProperties] = useState<{ key: string; value: string }[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);

  // Extract node type suggestions from existing graph
  const nodeTypeSuggestions = useMemo((): NodeTypeSuggestion[] => {
    const typeMap = new Map<string, {
      labels: string[];
      propertyKeys: Set<string>;
      color: { border: string; bg: string; name: string };
      count: number;
    }>();

    nodes.forEach((node) => {
      const data = node.data as SchemaNodeData;
      if (!data.labels || data.labels.length === 0) return;

      // Use sorted labels as key to group same node types
      const labelsKey = [...data.labels].sort().join(':');
      
      if (typeMap.has(labelsKey)) {
        const existing = typeMap.get(labelsKey)!;
        // Merge property keys
        Object.keys(data.properties || {}).forEach((key) => {
          existing.propertyKeys.add(key);
        });
        existing.count++;
      } else {
        const borderColor = data.style?.borderColor || '#4C8EDA';
        const matchingPreset = COLOR_PRESETS.find((c) => c.border === borderColor);
        
        typeMap.set(labelsKey, {
          labels: data.labels,
          propertyKeys: new Set(Object.keys(data.properties || {})),
          color: matchingPreset || { border: borderColor, bg: `${borderColor}20`, name: 'Custom' },
          count: 1,
        });
      }
    });

    // Convert to array and sort by count (most used first)
    return Array.from(typeMap.values())
      .map((item) => ({
        labels: item.labels,
        properties: Array.from(item.propertyKeys).sort(),
        color: item.color,
        count: item.count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [nodes]);

  // Apply a suggestion to the form
  const applySuggestion = useCallback((suggestion: NodeTypeSuggestion) => {
    setLabels([...suggestion.labels]);
    setProperties(suggestion.properties.map((key) => ({ key, value: '' })));
    setSelectedColor(suggestion.color);
  }, []);

  // Reset form when dialog opens or node changes
  useEffect(() => {
    if (open) {
      if (existingData) {
        setLabels(existingData.labels || []);
        setProperties(
          Object.entries(existingData.properties || {}).map(([key, value]) => ({
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
          }))
        );
        const matchingColor = COLOR_PRESETS.find(
          (c) => c.border === existingData.style?.borderColor
        );
        setSelectedColor(matchingColor || COLOR_PRESETS[0]);
      } else {
        setLabels([]);
        setNewLabel('');
        setProperties([]);
        setSelectedColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
      }
    }
  }, [open, existingData]);

  const handleAddLabel = useCallback(() => {
    const trimmed = newLabel.trim();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels([...labels, trimmed]);
      setNewLabel('');
    }
  }, [newLabel, labels]);

  const handleRemoveLabel = useCallback((index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddProperty = useCallback(() => {
    setProperties([...properties, { key: '', value: '' }]);
  }, [properties]);

  const handleRemoveProperty = useCallback((index: number) => {
    setProperties((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePropertyChange = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      setProperties((prev) =>
        prev.map((prop, i) => (i === index ? { ...prop, [field]: value } : prop))
      );
    },
    []
  );

  const handleSave = useCallback(() => {
    const propsObject: Record<string, unknown> = {};
    properties.forEach(({ key, value }) => {
      if (key.trim()) {
        // Try to parse JSON values
        try {
          propsObject[key.trim()] = JSON.parse(value);
        } catch {
          propsObject[key.trim()] = value;
        }
      }
    });

    const nodeData = {
      labels,
      properties: propsObject,
      style: {
        borderColor: selectedColor.border,
        backgroundColor: selectedColor.bg,
      },
    };

    if (nodeId && existingNode) {
      updateNode(nodeId, nodeData);
    } else {
      addNode(nodeData);
    }

    onOpenChange(false);
  }, [labels, properties, selectedColor, nodeId, existingNode, addNode, updateNode, onOpenChange]);

  const isEditing = !!nodeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <Circle className="w-4 h-4" style={{ color: selectedColor.border }} />
            {isEditing ? 'Edit Node' : 'Create New Node'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            {/* Node Type Suggestions - Only show when creating new node and suggestions exist */}
            {!isEditing && nodeTypeSuggestions.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Use Existing Type ({nodeTypeSuggestions.length})
                </Label>
                <div className="max-h-[200px] overflow-y-auto overscroll-contain rounded-lg border border-zinc-800/50 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
                  {nodeTypeSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className="w-full flex items-start gap-3 p-3 border-b border-zinc-800/50 last:border-b-0 hover:bg-zinc-800/50 transition-all text-left"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0 mt-0.5 ring-2 ring-offset-1 ring-offset-zinc-900"
                        style={{
                          backgroundColor: suggestion.color.bg,
                          borderColor: suggestion.color.border,
                          ringColor: suggestion.color.border,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {suggestion.labels.map((label, labelIdx) => (
                            <Badge
                              key={labelIdx}
                              variant="secondary"
                              className="text-xs font-medium"
                              style={{
                                backgroundColor: `${suggestion.color.border}15`,
                                color: suggestion.color.border,
                                borderColor: `${suggestion.color.border}40`,
                                borderWidth: '1px',
                              }}
                            >
                              {label}
                            </Badge>
                          ))}
                          <span className="text-[10px] text-zinc-500">
                            ({suggestion.count} {suggestion.count === 1 ? 'node' : 'nodes'})
                          </span>
                        </div>
                        {suggestion.properties.length > 0 && (
                          <div className="mt-1.5 text-xs text-zinc-500 truncate">
                            Properties: {suggestion.properties.join(', ')}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <Separator className="bg-zinc-800 mt-4" />
              </div>
            )}

            {/* Color Selection */}
            <div>
              <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 block">
                Node Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color.border}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
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
              <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 block">
                Labels
              </Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {labels.map((label, index) => (
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
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {labels.length === 0 && (
                  <span className="text-sm text-zinc-500 italic">No labels</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Add label..."
                  className="bg-zinc-800 border-zinc-700 text-zinc-200"
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
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Properties */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Properties
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddProperty}
                  className="gap-1 h-7"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {properties.map((prop, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      value={prop.key}
                      onChange={(e) => handlePropertyChange(index, 'key', e.target.value)}
                      placeholder="Key"
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 flex-1"
                    />
                    <Input
                      value={prop.value}
                      onChange={(e) => handlePropertyChange(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveProperty(index)}
                      className="shrink-0 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {properties.length === 0 && (
                  <p className="text-sm text-zinc-500 italic">No properties</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={labels.length === 0}>
            {isEditing ? 'Save Changes' : 'Create Node'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
