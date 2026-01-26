'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Circle } from 'lucide-react';
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
