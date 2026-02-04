'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  GitBranch, 
  Atom, 
  Circle, 
  Grid3X3, 
  ArrowDownUp,
  ArrowLeftRight,
  Maximize2,
  RotateCcw,
  Layers,
  EyeOff,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGraphStore, useHasActiveHighlights, useHideNonHighlighted } from '@/lib/graph-store';
import { 
  applyLayout, 
  type LayoutAlgorithm, 
  type LayoutDirection 
} from '@/lib/layout-engine';

const layoutOptions: { value: LayoutAlgorithm; label: string; icon: typeof GitBranch }[] = [
  { value: 'hierarchical', label: 'Hierarchical', icon: GitBranch },
  { value: 'force', label: 'Force-Directed', icon: Atom },
  { value: 'radial', label: 'Radial', icon: Circle },
  { value: 'grid', label: 'Grid', icon: Grid3X3 },
];

export function LayoutToolbar() {
  const [algorithm, setAlgorithm] = useState<LayoutAlgorithm>('hierarchical');
  const [direction, setDirection] = useState<LayoutDirection>('TB');
  const [spacing, setSpacing] = useState(100);

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const setNodes = useGraphStore((state) => state.setNodes);
  // For centering layout, only use if exactly one node is selected
  const selectedNodeId = useGraphStore((state) => 
    state.selectedNodeIds.length === 1 ? state.selectedNodeIds[0] : null
  );
  const showGroups = useGraphStore((state) => state.showGroups);
  const setShowGroups = useGraphStore((state) => state.setShowGroups);
  const setHideNonHighlighted = useGraphStore((state) => state.setHideNonHighlighted);
  const hasActiveHighlights = useHasActiveHighlights();
  const hideNonHighlighted = useHideNonHighlighted();
  
  // Track if we've applied initial layout for the current graph
  const appliedLayoutForNodes = useRef<string>('');

  const handleApplyLayout = useCallback(() => {
    if (nodes.length === 0) return;

    const newNodes = applyLayout(nodes, edges, algorithm, {
      direction,
      nodeSpacing: spacing,
      rankSpacing: spacing * 1.2,
      centerNodeId: selectedNodeId || undefined,
      showGroups,
    });

    setNodes(newNodes);
  }, [nodes, edges, algorithm, direction, spacing, selectedNodeId, setNodes, showGroups]);

  // Automatically apply layout when graph is first loaded
  useEffect(() => {
    if (nodes.length === 0) {
      appliedLayoutForNodes.current = '';
      return;
    }

    // Create a simple hash of node IDs to track if this is a new graph
    const nodeIdsHash = nodes.map(n => n.id).sort().join(',');
    
    // Only apply layout if this is a new graph (different node IDs)
    // This ensures we only auto-apply on initial load, not when settings change
    if (nodeIdsHash !== appliedLayoutForNodes.current) {
      // Apply layout with current spacing value
      const newNodes = applyLayout(nodes, edges, algorithm, {
        direction,
        nodeSpacing: spacing,
        rankSpacing: spacing * 1.2,
        centerNodeId: selectedNodeId || undefined,
        showGroups,
      });
      setNodes(newNodes);
      appliedLayoutForNodes.current = nodeIdsHash;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, setNodes]); // Only re-run when graph data changes, not layout settings

  const handleReset = useCallback(() => {
    // Re-apply current layout
    handleApplyLayout();
  }, [handleApplyLayout]);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3 p-3 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-xl shadow-xl">
        {/* Layout Algorithm Selector */}
        <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as LayoutAlgorithm)}>
          <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-zinc-200">
            <SelectValue placeholder="Layout" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {layoutOptions.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                className="text-zinc-200 focus:bg-zinc-700 focus:text-zinc-100"
              >
                <div className="flex items-center gap-2">
                  <option.icon className="w-4 h-4 text-zinc-400" />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Direction Toggle (only for hierarchical) */}
        {algorithm === 'hierarchical' && (
          <div className="flex items-center gap-1 border-l border-zinc-700 pl-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={direction === 'TB' || direction === 'BT' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDirection(direction === 'TB' ? 'BT' : 'TB')}
                >
                  <ArrowDownUp className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Vertical Layout ({direction === 'TB' ? 'Top to Bottom' : 'Bottom to Top'})</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={direction === 'LR' || direction === 'RL' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDirection(direction === 'LR' ? 'RL' : 'LR')}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Horizontal Layout ({direction === 'LR' ? 'Left to Right' : 'Right to Left'})</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Groups Toggle */}
        <div className="flex items-center gap-2 border-l border-zinc-700 pl-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-groups"
                  checked={showGroups}
                  onCheckedChange={setShowGroups}
                  className="data-[state=checked]:bg-blue-600"
                />
                <Label 
                  htmlFor="show-groups" 
                  className="text-xs text-zinc-400 cursor-pointer flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Groups
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle group node visibility</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Hide Non-Highlighted - Only shows when query highlights are active */}
        {hasActiveHighlights && (
          <div className="flex items-center gap-2 border-l border-zinc-700 pl-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={hideNonHighlighted ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setHideNonHighlighted(!hideNonHighlighted)}
                  className={`gap-2 ${hideNonHighlighted ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-emerald-400 hover:text-emerald-300'}`}
                >
                  {hideNonHighlighted ? (
                    <>
                      <Eye className="w-4 h-4" />
                      Show All
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Focus
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{hideNonHighlighted ? 'Show all nodes' : 'Hide non-highlighted nodes'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Spacing Slider */}
        <div className="flex items-center gap-3 border-l border-zinc-700 pl-3">
          <span className="text-xs text-zinc-400 whitespace-nowrap">Spacing</span>
          <Slider
            value={[spacing]}
            onValueChange={([v]) => setSpacing(v)}
            min={50}
            max={300}
            step={10}
            className="w-24"
          />
          <span className="text-xs text-zinc-500 w-8">{spacing}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 border-l border-zinc-700 pl-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleApplyLayout}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Maximize2 className="w-4 h-4" />
                Apply
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Apply selected layout algorithm</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleReset}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset layout</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
