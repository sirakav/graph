'use client';

import { memo, useState, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SchemaNode as SchemaNodeType, SchemaNodeData } from '@/lib/arrow-parser';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/lib/graph-store';

// Custom handle styles - small but visible
const handleBaseStyles = `
  !w-1.5 !h-1.5 !rounded-full !border 
  transition-all duration-200 ease-out
  hover:!scale-150 hover:!shadow-md
`;

const targetHandleStyles = `
  ${handleBaseStyles}
  !bg-blue-400 !border-blue-500/50
  hover:!bg-blue-300 hover:!border-blue-400
`;

const sourceHandleStyles = `
  ${handleBaseStyles}
  !bg-emerald-400 !border-emerald-500/50
  hover:!bg-emerald-300 hover:!border-emerald-400
`;

function SchemaNodeComponent(props: NodeProps) {
  const { id, data, selected } = props;
  const [isHovered, setIsHovered] = useState(false);
  const nodeData = data as SchemaNodeData | undefined;
  
  // Check if this node is highlighted by a query mapping
  const highlightedNodeIds = useGraphStore((state) => state.highlightedNodeIds);
  const highlightedNodeLabels = useGraphStore((state) => state.highlightedNodeLabels);
  
  const isHighlighted = useMemo(() => {
    if (highlightedNodeIds.includes(id)) return true;
    if (nodeData?.labels?.some((label) => highlightedNodeLabels.includes(label))) return true;
    return false;
  }, [id, highlightedNodeIds, highlightedNodeLabels, nodeData?.labels]);
  
  // If no data, show debug info
  if (!nodeData || !nodeData.style) {
    return (
      <div className="p-4 bg-red-500 text-white min-w-[140px] rounded-lg">
        <div>No data: {JSON.stringify(data)}</div>
      </div>
    );
  }
  
  const { labels = [], properties = {}, style } = nodeData;
  const propertyEntries = Object.entries(properties);

  return (
    <div
      className={cn(
        'relative min-w-[140px] max-w-[280px] rounded-xl transition-all duration-200 group',
        'shadow-lg hover:shadow-xl',
        selected && 'ring-2 ring-offset-2 ring-offset-background',
        isHighlighted && 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background'
      )}
      style={{
        backgroundColor: style.backgroundColor,
        borderWidth: '3px',
        borderStyle: 'solid',
        borderColor: isHighlighted ? '#10b981' : style.borderColor,
        boxShadow: isHighlighted
          ? `0 0 20px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)`
          : selected
            ? `0 0 20px ${style.borderColor}80, 0 0 40px ${style.borderColor}40`
            : `0 4px 20px rgba(0, 0, 0, 0.3)`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Input Handle - Target (accepts incoming connections) */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          targetHandleStyles,
          isHovered && '!scale-125'
        )}
        title="Drag here to connect from another node"
      />

      {/* Labels */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 pb-0">
          {labels.map((label, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs font-semibold tracking-wide"
              style={{
                backgroundColor: `${style.borderColor}30`,
                color: style.borderColor,
                borderColor: style.borderColor,
                borderWidth: '1px',
              }}
            >
              {label}
            </Badge>
          ))}
        </div>
      )}

      {/* Properties */}
      {propertyEntries.length > 0 && (
        <div className="p-3 pt-2">
          <div className="space-y-1">
            {propertyEntries.slice(0, 5).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                <span className="text-zinc-400 font-mono shrink-0">{key}:</span>
                <span className="text-zinc-200 font-mono truncate">
                  {formatPropertyValue(value)}
                </span>
              </div>
            ))}
            {propertyEntries.length > 5 && (
              <div className="text-xs text-zinc-500 italic">
                +{propertyEntries.length - 5} more properties
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {labels.length === 0 && propertyEntries.length === 0 && (
        <div className="p-4 text-center text-zinc-500 text-sm">
          Empty Node
        </div>
      )}

      {/* Output Handle - Source (drag from here to connect) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          sourceHandleStyles,
          isHovered && '!scale-125'
        )}
        title="Drag from here to create a relationship"
      />
    </div>
  );
}

function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

export const SchemaNode = memo(SchemaNodeComponent);
