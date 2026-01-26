'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  SelectionMode,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Connection,
  type OnSelectionChangeParams,
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
  const selectNodes = useGraphStore((state) => state.selectNodes);
  const selectedNodeIds = useGraphStore((state) => state.selectedNodeIds);
  const selectEdge = useGraphStore((state) => state.selectEdge);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const openInspector = useGraphStore((state) => state.openInspector);
  const closeInspector = useGraphStore((state) => state.closeInspector);
  const showGroups = useGraphStore((state) => state.showGroups);
  const mouseMode = useGraphStore((state) => state.mouseMode);
  
  const addEdgeToStore = useGraphStore((state) => state.addEdge);
  const { fitView } = useReactFlow();
  const prevNodeIdsRef = useRef<string>('');
  const isInternalSelectionChange = useRef(false);

  // Filter out group nodes when showGroups is false
  // Also remove parentId from child nodes to prevent React Flow errors
  // And sync selection state with our store
  const filteredNodes = useMemo(() => {
    const selectedSet = new Set(selectedNodeIds);
    
    const processNodes = (nodes: typeof storeNodes) => {
      return nodes.map((node) => ({
        ...node,
        selected: selectedSet.has(node.id),
      }));
    };
    
    if (showGroups) return processNodes(storeNodes);
    
    // Get IDs of all group nodes
    const groupNodeIds = new Set(
      storeNodes.filter((node) => node.type === 'groupNode').map((node) => node.id)
    );
    
    // Filter out group nodes and remove parent references from children
    const filtered = storeNodes
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
      
    return processNodes(filtered);
  }, [storeNodes, showGroups, selectedNodeIds]);

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

  // Auto-fit view when a new graph is loaded (detected by node IDs changing)
  useEffect(() => {
    const currentNodeIds = storeNodes.map((n) => n.id).sort().join(',');
    const prevNodeIds = prevNodeIdsRef.current;
    
    // If node IDs have changed significantly (new graph loaded), fit view
    if (currentNodeIds !== prevNodeIds && storeNodes.length > 0) {
      // Small delay to ensure nodes are rendered
      const timeoutId = setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 50);
      
      prevNodeIdsRef.current = currentNodeIds;
      return () => clearTimeout(timeoutId);
    }
    
    prevNodeIdsRef.current = currentNodeIds;
  }, [storeNodes, fitView]);

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
    (event: React.MouseEvent, node: Node) => {
      // If clicking on an already-selected node, don't change selection
      // This allows dragging multiple selected nodes without losing selection
      if (selectedNodeIds.includes(node.id) && selectedNodeIds.length > 1) {
        return;
      }
      
      // In select mode, shift+click adds to selection
      // In pan mode, clicking always replaces selection
      const addToSelection = mouseMode === 'select' && (event.shiftKey || event.metaKey || event.ctrlKey);
      selectNode(node.id, addToSelection);
    },
    [selectNode, mouseMode, selectedNodeIds]
  );

  const handleEdgeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_: React.MouseEvent, edge: any) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  // Double-click on node opens the inspector
  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
      openInspector();
    },
    [selectNode, openInspector]
  );

  // Double-click on edge opens the inspector
  const handleEdgeDoubleClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_: React.MouseEvent, edge: any) => {
      selectEdge(edge.id);
      openInspector();
    },
    [selectEdge, openInspector]
  );

  const handlePaneClick = useCallback(() => {
    clearSelection();
    closeInspector();
  }, [clearSelection, closeInspector]);
  
  // Handle selection changes from React Flow (e.g., from drag selection box)
  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      // Prevent infinite loops - only process external selection changes
      if (isInternalSelectionChange.current) {
        isInternalSelectionChange.current = false;
        return;
      }
      
      const newSelectedIds = params.nodes.map((n) => n.id);
      
      // Only update if selection actually changed
      const currentIds = selectedNodeIds.sort().join(',');
      const newIds = newSelectedIds.sort().join(',');
      
      if (currentIds !== newIds) {
        isInternalSelectionChange.current = true;
        selectNodes(newSelectedIds);
      }
    },
    [selectNodes, selectedNodeIds]
  );

  // Handle new edge connections (drag from handle to handle)
  // Automatically creates the edge with a default type, user can edit in inspector
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdgeToStore({
          sourceId: connection.source,
          targetId: connection.target,
          relationshipType: 'RELATES_TO',
          properties: {},
        });
      }
    },
    [addEdgeToStore]
  );

  // Configure based on mouse mode
  const isSelectMode = mouseMode === 'select';
  
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onEdgeClick={handleEdgeClick}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        onPaneClick={handlePaneClick}
        onConnect={handleConnect}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
        connectOnClick={false}
        // Nodes are always draggable
        nodesDraggable={true}
        // Selection mode configuration
        selectionOnDrag={isSelectMode}
        selectionMode={SelectionMode.Partial}
        // In pan mode: drag pans the canvas, in select mode: drag creates selection box
        panOnDrag={!isSelectMode}
        // Allow multi-selection with modifier keys in both modes
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        // In select mode, allow panning with scroll wheel
        panOnScroll={isSelectMode}
        selectionKeyCode={null}
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
