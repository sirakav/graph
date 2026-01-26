'use client';

import { memo, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { SchemaEdge, SchemaEdgeData } from '@/lib/arrow-parser';
import { useGraphStore } from '@/lib/graph-store';
import { cn } from '@/lib/utils';

function SchemaEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<SchemaEdge>) {
  const selectEdge = useGraphStore((state) => state.selectEdge);
  const openInspector = useGraphStore((state) => state.openInspector);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as SchemaEdgeData | undefined;
  const relationshipType = edgeData?.relationshipType || '';

  // Handle label click - select edge and open inspector
  const handleLabelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectEdge(id);
    openInspector();
  }, [id, selectEdge, openInspector]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#60a5fa' : '#6b7280',
          strokeWidth: selected ? 2.5 : 2,
          filter: selected ? 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.5))' : 'none',
        }}
      />
      {relationshipType && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'absolute pointer-events-auto nodrag nopan cursor-pointer z-50',
              'px-2 py-1 rounded-md text-xs font-mono font-medium',
              'transition-all duration-200',
              selected
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                : 'bg-zinc-800/90 text-zinc-300 border border-zinc-700 hover:bg-zinc-700/90 hover:border-zinc-600'
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            onClick={handleLabelClick}
            title="Click to edit relationship"
          >
            {relationshipType}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const SchemaEdgeComponent_ = memo(SchemaEdgeComponent);
export { SchemaEdgeComponent_ as SchemaEdge };
