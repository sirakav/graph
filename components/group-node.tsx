'use client';

import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react';
import type { SchemaNodeData } from '@/lib/arrow-parser';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Layers } from 'lucide-react';

function GroupNodeComponent(props: NodeProps) {
  const { data, selected } = props;
  const nodeData = data as SchemaNodeData | undefined;

  // Default styles if no data provided
  if (!nodeData || !nodeData.style) {
    return (
      <div className="p-4 bg-zinc-800/50 text-white min-w-[200px] min-h-[150px] rounded-xl border-2 border-dashed border-zinc-600">
        <div className="text-zinc-400 text-sm">Empty Group</div>
      </div>
    );
  }

  const { labels = [], properties = {}, style, childNodeIds = [] } = nodeData;
  const childCount = childNodeIds.length;

  // Create a semi-transparent version of the border color for the background
  const bgColor = useMemo(() => {
    const borderColor = style.borderColor || '#6b7280';
    // Parse hex color and create rgba
    const hex = borderColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.08)`;
  }, [style.borderColor]);

  return (
    <>
      {/* Node Resizer - allows resizing when selected */}
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        lineClassName="!border-blue-400"
        handleClassName="!w-2 !h-2 !bg-blue-400 !border-2 !border-zinc-900"
      />

      <div
        className={cn(
          'relative min-w-[200px] min-h-[150px] rounded-xl transition-all duration-200',
          'border-2 border-dashed',
          selected && 'ring-2 ring-offset-2 ring-offset-zinc-950 ring-blue-400'
        )}
        style={{
          backgroundColor: bgColor,
          borderColor: style.borderColor || '#6b7280',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Group Header */}
        <div
          className="absolute -top-0 left-0 right-0 px-3 py-2 rounded-t-xl flex items-center gap-2"
          style={{
            backgroundColor: `${style.borderColor}20`,
            borderBottom: `1px dashed ${style.borderColor}40`,
          }}
        >
          <Layers className="w-4 h-4" style={{ color: style.borderColor }} />
          
          {/* Labels */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
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

          {/* Child count badge */}
          <div className="ml-auto">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${style.borderColor}20`,
                color: style.borderColor,
              }}
            >
              {childCount} {childCount === 1 ? 'node' : 'nodes'}
            </span>
          </div>
        </div>

        {/* Properties (shown subtly in corner) */}
        {Object.keys(properties).length > 0 && (
          <div className="absolute bottom-2 left-3 right-3">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(properties).slice(0, 3).map(([key, value]) => (
                <span
                  key={key}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${style.borderColor}15`,
                    color: `${style.borderColor}cc`,
                  }}
                >
                  {key}: {formatPropertyValue(value)}
                </span>
              ))}
              {Object.keys(properties).length > 3 && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${style.borderColor}15`,
                    color: `${style.borderColor}99`,
                  }}
                >
                  +{Object.keys(properties).length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-600 hover:!bg-zinc-300 transition-colors !top-[-6px]"
        />

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-600 hover:!bg-zinc-300 transition-colors !bottom-[-6px]"
        />
      </div>
    </>
  );
}

function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value.length > 15 ? value.substring(0, 15) + '...' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

export const GroupNode = memo(GroupNodeComponent);
