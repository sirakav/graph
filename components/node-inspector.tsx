'use client';

import { X, Circle, ArrowRight, Layers, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useGraphStore, useSelectedNode, useSelectedEdge } from '@/lib/graph-store';
import type { SchemaNodeData, SchemaEdgeData } from '@/lib/arrow-parser';

export function NodeInspector() {
  const selectedNode = useSelectedNode();
  const selectedEdge = useSelectedEdge();
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const nodes = useGraphStore((state) => state.nodes);

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
                    <Circle className="w-4 h-4" style={{ color: nodeData.style.borderColor }} />
                  )}
                  {nodeData.isGroup ? 'Group Details' : 'Node Details'}
                </>
              )}
              {selectedEdge && (
                <>
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                  Relationship Details
                </>
              )}
            </SheetTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearSelection}
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {selectedNode && nodeData && (
            <div className="p-4 space-y-6">
              {/* Node ID */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Node ID
                </h4>
                <p className="text-sm font-mono text-zinc-300 bg-zinc-800 px-3 py-2 rounded">
                  {selectedNode.id}
                </p>
              </div>

              {/* Group Info - Show if this is a group or belongs to a group */}
              {(nodeData.isGroup || nodeData.groupId) && (
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                    Group Info
                  </h4>
                  <div className="space-y-2">
                    {nodeData.isGroup && (
                      <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-3">
                        <Layers className="w-4 h-4" style={{ color: nodeData.style.borderColor }} />
                        <div>
                          <div className="text-xs text-zinc-500">This is a group container</div>
                          <div className="text-sm text-zinc-200">
                            {nodeData.childNodeIds?.length || 0} contained {(nodeData.childNodeIds?.length || 0) === 1 ? 'node' : 'nodes'}
                          </div>
                        </div>
                      </div>
                    )}
                    {nodeData.groupId && (
                      <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-3">
                        <FolderTree className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="text-xs text-zinc-500">Member of group</div>
                          <div className="text-sm font-mono text-zinc-200">
                            {nodeData.groupId}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Labels */}
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

              <Separator className="bg-zinc-800" />

              {/* Properties */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Properties
                </h4>
                {Object.keys(nodeData.properties).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(nodeData.properties).map(([key, value]) => (
                      <div key={key} className="bg-zinc-800 rounded-lg p-3">
                        <div className="text-xs text-zinc-500 mb-1">{key}</div>
                        <div className="text-sm font-mono text-zinc-200 break-all">
                          {formatValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No properties</p>
                )}
              </div>

              <Separator className="bg-zinc-800" />

              {/* Position */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Position
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-1">X</div>
                    <div className="text-sm font-mono text-zinc-200">
                      {Math.round(selectedNode.position.x)}
                    </div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-1">Y</div>
                    <div className="text-sm font-mono text-zinc-200">
                      {Math.round(selectedNode.position.y)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Style */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Style
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3">
                    <div
                      className="w-6 h-6 rounded-full border-2"
                      style={{
                        backgroundColor: nodeData.style.backgroundColor,
                        borderColor: nodeData.style.borderColor,
                      }}
                    />
                    <div>
                      <div className="text-xs text-zinc-500">Background</div>
                      <div className="text-xs font-mono text-zinc-400">
                        {nodeData.style.backgroundColor}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: nodeData.style.borderColor }}
                    />
                    <div>
                      <div className="text-xs text-zinc-500">Border</div>
                      <div className="text-xs font-mono text-zinc-400">
                        {nodeData.style.borderColor}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedEdge && edgeData && (
            <div className="p-4 space-y-6">
              {/* Relationship Type */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Relationship Type
                </h4>
                <Badge
                  variant="secondary"
                  className="text-sm bg-blue-500/20 text-blue-300 border-blue-500/50"
                >
                  {edgeData.relationshipType || 'RELATES_TO'}
                </Badge>
              </div>

              {/* Connection */}
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

              {/* Properties */}
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  Properties
                </h4>
                {edgeData.properties && Object.keys(edgeData.properties).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(edgeData.properties).map(([key, value]) => (
                      <div key={key} className="bg-zinc-800 rounded-lg p-3">
                        <div className="text-xs text-zinc-500 mb-1">{key}</div>
                        <div className="text-sm font-mono text-zinc-200 break-all">
                          {formatValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No properties</p>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}
