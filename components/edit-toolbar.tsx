'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Hand, MousePointer2, Trash2, Group, Ungroup } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { NodeEditorDialog } from './node-editor-dialog';
import { useGraphStore, type MouseMode } from '@/lib/graph-store';
import { cn } from '@/lib/utils';

export function EditToolbar() {
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const mouseMode = useGraphStore((state) => state.mouseMode);
  const setMouseMode = useGraphStore((state) => state.setMouseMode);
  const selectedNodeIds = useGraphStore((state) => state.selectedNodeIds);
  const nodes = useGraphStore((state) => state.nodes);
  const deleteSelectedNodes = useGraphStore((state) => state.deleteSelectedNodes);
  const groupSelectedNodes = useGraphStore((state) => state.groupSelectedNodes);
  const ungroupNodes = useGraphStore((state) => state.ungroupNodes);
  
  // Check if selection contains a group that can be ungrouped
  const selectedGroupId = useMemo(() => {
    if (selectedNodeIds.length !== 1) return null;
    const node = nodes.find((n) => n.id === selectedNodeIds[0]);
    if (node?.type === 'groupNode') return node.id;
    return null;
  }, [selectedNodeIds, nodes]);
  
  // Check if we can group (need 2+ regular nodes selected, no groups)
  const canGroup = useMemo(() => {
    if (selectedNodeIds.length < 2) return false;
    const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
    // All selected nodes must be non-group nodes
    return selectedNodes.every((n) => n.type !== 'groupNode');
  }, [selectedNodeIds, nodes]);
  
  // Keyboard shortcuts for mode switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // V for select mode (like most design tools)
      if (e.key === 'v' || e.key === 'V') {
        setMouseMode('select');
      }
      // H for pan/hand mode
      if (e.key === 'h' || e.key === 'H') {
        setMouseMode('pan');
      }
      // Delete/Backspace to delete selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length > 0) {
        e.preventDefault();
        deleteSelectedNodes();
      }
      // Escape to clear selection and go back to pan mode
      if (e.key === 'Escape') {
        setMouseMode('pan');
      }
      // Cmd/Ctrl+G to group selected nodes
      if ((e.metaKey || e.ctrlKey) && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        if (canGroup) {
          groupSelectedNodes();
        } else if (selectedGroupId) {
          ungroupNodes(selectedGroupId);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMouseMode, selectedNodeIds.length, deleteSelectedNodes, canGroup, selectedGroupId, groupSelectedNodes, ungroupNodes]);

  return (
    <div className="flex items-center gap-2">
      {/* Mouse Mode Toggle */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg shadow-lg">
        <ToggleGroup 
          type="single" 
          value={mouseMode} 
          onValueChange={(value) => value && setMouseMode(value as MouseMode)}
          className="gap-0"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="pan" 
                aria-label="Pan mode"
                className={cn(
                  "h-8 w-8 p-0 data-[state=on]:bg-zinc-700 data-[state=on]:text-white",
                  "hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                <Hand className="w-4 h-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Pan mode <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-background/20 border border-current/20 rounded">H</kbd></p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="select" 
                aria-label="Select mode"
                className={cn(
                  "h-8 w-8 p-0 data-[state=on]:bg-zinc-700 data-[state=on]:text-white",
                  "hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                <MousePointer2 className="w-4 h-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Select mode <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-background/20 border border-current/20 rounded">V</kbd></p>
            </TooltipContent>
          </Tooltip>
        </ToggleGroup>
      </div>

      {/* Selection Actions */}
      {selectedNodeIds.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg shadow-lg">
          <span className="text-xs text-zinc-400 px-1">
            {selectedNodeIds.length} selected
          </span>
          
          <Separator orientation="vertical" className="h-4 bg-zinc-700" />
          
          {/* Group button - show when 2+ non-group nodes selected */}
          {canGroup && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  onClick={() => groupSelectedNodes()}
                >
                  <Group className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Group nodes <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-background/20 border border-current/20 rounded">⌘G</kbd></p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Ungroup button - show when a single group is selected */}
          {selectedGroupId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  onClick={() => ungroupNodes(selectedGroupId)}
                >
                  <Ungroup className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Ungroup <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-background/20 border border-current/20 rounded">⌘G</kbd></p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Delete button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                onClick={deleteSelectedNodes}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Delete <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-background/20 border border-current/20 rounded">Del</kbd></p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Add Node Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={() => setNodeDialogOpen(true)}
            className="h-10 w-10 rounded-full shadow-lg"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Add node</TooltipContent>
      </Tooltip>

      <NodeEditorDialog
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        nodeId={null}
      />
    </div>
  );
}
