import { create } from 'zustand';
import type { SchemaNodeData, SchemaEdgeData, ArrowGraphStyle, GraphNode, SchemaEdge } from './arrow-parser';

interface NewNodeData {
  labels: string[];
  properties: Record<string, unknown>;
  style?: {
    borderColor?: string;
    backgroundColor?: string;
  };
}

interface NewEdgeData {
  sourceId: string;
  targetId: string;
  relationshipType: string;
  properties?: Record<string, unknown>;
}

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
  
  // Edit actions
  addNode: (data: NewNodeData, position?: { x: number; y: number }) => string;
  updateNode: (nodeId: string, data: Partial<NewNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (data: NewEdgeData) => string;
  updateEdge: (edgeId: string, data: { relationshipType?: string; properties?: Record<string, unknown> }) => void;
  deleteEdge: (edgeId: string) => void;
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
  
  // Edit actions
  addNode: (data, position) => {
    const id = `n${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const defaultColors = ['#4C8EDA', '#DA4C4C', '#4CDA7B', '#DA9A4C', '#9A4CDA', '#4CDADA'];
    const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];
    
    const newNode: GraphNode = {
      id,
      type: 'schemaNode',
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        labels: data.labels,
        properties: data.properties,
        style: {
          borderColor: data.style?.borderColor || randomColor,
          backgroundColor: data.style?.backgroundColor || `${randomColor}20`,
        },
      },
    };
    
    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
      selectedEdgeId: null,
    }));
    
    return id;
  },
  
  updateNode: (nodeId, data) => set((state) => ({
    nodes: state.nodes.map((node) => {
      if (node.id !== nodeId) return node;
      
      const currentData = node.data as SchemaNodeData;
      return {
        ...node,
        data: {
          ...currentData,
          labels: data.labels ?? currentData.labels,
          properties: data.properties ?? currentData.properties,
          style: {
            ...currentData.style,
            ...(data.style ? {
              borderColor: data.style.borderColor ?? currentData.style.borderColor,
              backgroundColor: data.style.backgroundColor ?? currentData.style.backgroundColor,
            } : {}),
          },
        },
      };
    }),
  })),
  
  deleteNode: (nodeId) => set((state) => ({
    nodes: state.nodes.filter((n) => n.id !== nodeId),
    edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
  })),
  
  addEdge: (data) => {
    const id = `e${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newEdge: SchemaEdge = {
      id,
      source: data.sourceId,
      target: data.targetId,
      type: 'schemaEdge',
      data: {
        relationshipType: data.relationshipType,
        properties: data.properties || {},
      },
    };
    
    set((state) => ({
      edges: [...state.edges, newEdge],
      selectedNodeId: null,
      selectedEdgeId: id,
    }));
    
    return id;
  },
  
  updateEdge: (edgeId, data) => set((state) => ({
    edges: state.edges.map((edge) => {
      if (edge.id !== edgeId) return edge;
      
      const currentData = edge.data as SchemaEdgeData;
      return {
        ...edge,
        data: {
          ...currentData,
          relationshipType: data.relationshipType ?? currentData.relationshipType,
          properties: data.properties ?? currentData.properties,
        },
      };
    }),
  })),
  
  deleteEdge: (edgeId) => set((state) => ({
    edges: state.edges.filter((e) => e.id !== edgeId),
    selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
  })),
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
