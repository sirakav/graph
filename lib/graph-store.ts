import { create } from 'zustand';
import type { SchemaNodeData, SchemaEdgeData, ArrowGraphStyle, GraphNode, SchemaEdge } from './arrow-parser';

interface GraphState {
  // Graph data
  nodes: GraphNode[];
  edges: SchemaEdge[];
  graphStyle: ArrowGraphStyle;
  
  // Selection state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  
  // UI state
  isLoading: boolean;
  showGroups: boolean;
  
  // Actions
  setGraph: (nodes: GraphNode[], edges: SchemaEdge[], style: ArrowGraphStyle) => void;
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: SchemaEdge[]) => void;
  updateNodePositions: (updates: { id: string; position: { x: number; y: number } }[]) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setShowGroups: (show: boolean) => void;
  clearGraph: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  // Initial state
  nodes: [],
  edges: [],
  graphStyle: {},
  selectedNodeId: null,
  selectedEdgeId: null,
  isLoading: false,
  showGroups: true,
  
  // Actions
  setGraph: (nodes, edges, style) => set({
    nodes,
    edges,
    graphStyle: style,
    selectedNodeId: null,
    selectedEdgeId: null,
  }),
  
  setNodes: (nodes) => set({ nodes }),
  
  setEdges: (edges) => set({ edges }),
  
  updateNodePositions: (updates) => set((state) => {
    const nodeMap = new Map(updates.map(u => [u.id, u.position]));
    return {
      nodes: state.nodes.map((node) => {
        const newPos = nodeMap.get(node.id);
        if (newPos) {
          return { ...node, position: newPos };
        }
        return node;
      }),
    };
  }),
  
  selectNode: (nodeId) => set({
    selectedNodeId: nodeId,
    selectedEdgeId: null,
  }),
  
  selectEdge: (edgeId) => set({
    selectedNodeId: null,
    selectedEdgeId: edgeId,
  }),
  
  clearSelection: () => set({
    selectedNodeId: null,
    selectedEdgeId: null,
  }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setShowGroups: (show) => set({ showGroups: show }),
  
  clearGraph: () => set({
    nodes: [],
    edges: [],
    graphStyle: {},
    selectedNodeId: null,
    selectedEdgeId: null,
  }),
}));

// Selectors
export const useNodes = () => useGraphStore((state) => state.nodes);
export const useEdges = () => useGraphStore((state) => state.edges);
export const useGraphStyle = () => useGraphStore((state) => state.graphStyle);
export const useSelectedNodeId = () => useGraphStore((state) => state.selectedNodeId);
export const useSelectedEdgeId = () => useGraphStore((state) => state.selectedEdgeId);
export const useIsLoading = () => useGraphStore((state) => state.isLoading);
export const useShowGroups = () => useGraphStore((state) => state.showGroups);

export const useSelectedNode = () => {
  const nodes = useNodes();
  const selectedId = useSelectedNodeId();
  return selectedId ? nodes.find((n) => n.id === selectedId) : null;
};

export const useSelectedEdge = () => {
  const edges = useEdges();
  const selectedId = useSelectedEdgeId();
  return selectedId ? edges.find((e) => e.id === selectedId) : null;
};
