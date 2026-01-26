'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SchemaNode } from './schema-node';
import { SchemaEdge } from './schema-edge';
import { GroupNode } from './group-node';
import { useGraphStore } from '@/lib/graph-store';
import type { SchemaNodeData } from '@/lib/arrow-parser';

const nodeTypes: NodeTypes = {
  schemaNode: SchemaNode,
  groupNode: GroupNode,
};

const edgeTypes: EdgeTypes = {
  schemaEdge: SchemaEdge,
};

const defaultEdgeOptions = {
  type: 'schemaEdge',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#6b7280',
  },
};

export function GraphCanvas() {
  const storeNodes = useGraphStore((state) => state.nodes);
  const storeEdges = useGraphStore((state) => state.edges);
  const setStoreNodes = useGraphStore((state) => state.setNodes);
  const selectNode = useGraphStore((state) => state.selectNode);
  const selectEdge = useGraphStore((state) => state.selectEdge);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const showGroups = useGraphStore((state) => state.showGroups);

  // Filter out group nodes when showGroups is false
  // Also remove parentId from child nodes to prevent React Flow errors
  const filteredNodes = useMemo(() => {
    if (showGroups) return storeNodes;
    
    // Get IDs of all group nodes
    const groupNodeIds = new Set(
      storeNodes.filter((node) => node.type === 'groupNode').map((node) => node.id)
    );
    
    // Filter out group nodes and remove parent references from children
    return storeNodes
      .filter((node) => node.type !== 'groupNode')
      .map((node) => {
        // If this node's parent is a hidden group, remove the parent reference
        if ('parentId' in node && groupNodeIds.has(node.parentId as string)) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { parentId, extent, ...rest } = node;
          return rest as typeof node;
        }
        return node;
      });
  }, [storeNodes, showGroups]);

  // Add markers to edges
  const edgesWithMarkers = storeEdges.map((edge) => ({
    ...edge,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#6b7280',
    },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesWithMarkers);

  // Sync with store when store changes or showGroups changes
  useEffect(() => {
    setNodes(filteredNodes);
  }, [filteredNodes, setNodes]);

  useEffect(() => {
    setEdges(edgesWithMarkers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeEdges, setEdges]);

  const handleNodesChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (changes: any[]) => {
      onNodesChange(changes);
      
      // Update store with position changes after dragging ends
      const positionChanges = changes.filter(
        (change) => change.type === 'position' && !change.dragging && change.position
      );
      if (positionChanges.length > 0) {
        // Important: update positions in the FULL store nodes, not just filtered nodes
        // This preserves group nodes even when they're hidden
        const updatedNodes = storeNodes.map((node) => {
          const change = positionChanges.find((c) => c.id === node.id);
          if (change?.position) {
            return { ...node, position: change.position };
          }
          return node;
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setStoreNodes(updatedNodes as any);
      }
    },
    [onNodesChange, storeNodes, setStoreNodes]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleEdgeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_: React.MouseEvent, edge: any) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
      >
        <Background
          color="#27272a"
          gap={20}
          size={1}
          className="!bg-zinc-950"
        />
        <Controls
          className="!bg-zinc-800 !border-zinc-700 !rounded-lg !shadow-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-700"
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as SchemaNodeData;
            return data?.style?.borderColor || '#4C8EDA';
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
