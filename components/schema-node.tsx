'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SchemaNode as SchemaNodeType, SchemaNodeData } from '@/lib/arrow-parser';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Simple test component to debug rendering issues
function SchemaNodeComponent(props: NodeProps) {
  console.log('SchemaNode render called with props:', props);
  
  const { data, selected } = props;
  const nodeData = data as SchemaNodeData | undefined;
  
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
        'relative min-w-[140px] max-w-[280px] rounded-xl transition-all duration-200',
        'shadow-lg hover:shadow-xl',
        selected && 'ring-2 ring-offset-2 ring-offset-background'
      )}
      style={{
        backgroundColor: style.backgroundColor,
        borderWidth: '3px',
        borderStyle: 'solid',
        borderColor: style.borderColor,
        boxShadow: selected
          ? `0 0 20px ${style.borderColor}80, 0 0 40px ${style.borderColor}40`
          : `0 4px 20px rgba(0, 0, 0, 0.3)`,
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-600 hover:!bg-zinc-300 transition-colors"
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

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-600 hover:!bg-zinc-300 transition-colors"
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
