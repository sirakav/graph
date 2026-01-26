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

export type MouseMode = 'pan' | 'select';

interface GraphState {
  // Graph data
  nodes: GraphNode[];
  edges: SchemaEdge[];
  graphStyle: ArrowGraphStyle;
  
  // Selection state (supports multi-selection)
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  
  // Inspector drawer state (only opens on explicit action like double-click)
  inspectorOpen: boolean;
  
  // Mouse mode
  mouseMode: MouseMode;
  
  // UI state
  isLoading: boolean;
  showGroups: boolean;
  
  // Actions
  setGraph: (nodes: GraphNode[], edges: SchemaEdge[], style: ArrowGraphStyle) => void;
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: SchemaEdge[]) => void;
  updateNodePositions: (updates: { id: string; position: { x: number; y: number } }[]) => void;
  
  // Selection actions
  selectNode: (nodeId: string | null, addToSelection?: boolean) => void;
  selectNodes: (nodeIds: string[]) => void;
  toggleNodeSelection: (nodeId: string) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  
  // Mouse mode
  setMouseMode: (mode: MouseMode) => void;
  
  // Inspector
  openInspector: () => void;
  closeInspector: () => void;
  
  setLoading: (loading: boolean) => void;
  setShowGroups: (show: boolean) => void;
  clearGraph: () => void;
  
  // Edit actions
  addNode: (data: NewNodeData, position?: { x: number; y: number }) => string;
  updateNode: (nodeId: string, data: Partial<NewNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteSelectedNodes: () => void;
  addEdge: (data: NewEdgeData) => string;
  updateEdge: (edgeId: string, data: { relationshipType?: string; properties?: Record<string, unknown> }) => void;
  deleteEdge: (edgeId: string) => void;
  
  // Group actions
  groupSelectedNodes: () => string | null;
  ungroupNodes: (groupId: string) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  // Initial state
  nodes: [],
  edges: [],
  graphStyle: {},
  selectedNodeIds: [],
  selectedEdgeId: null,
  inspectorOpen: false,
  mouseMode: 'pan',
  isLoading: false,
  showGroups: true,
  
  // Actions
  setGraph: (nodes, edges, style) => set({
    nodes,
    edges,
    graphStyle: style,
    selectedNodeIds: [],
    selectedEdgeId: null,
    inspectorOpen: false,
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
  
  // Single node selection (optionally add to existing selection)
  selectNode: (nodeId, addToSelection = false) => set((state) => {
    if (nodeId === null) {
      return { selectedNodeIds: [], selectedEdgeId: null };
    }
    if (addToSelection) {
      // Add to selection if not already selected
      if (state.selectedNodeIds.includes(nodeId)) {
        return state; // Already selected, no change
      }
      return { 
        selectedNodeIds: [...state.selectedNodeIds, nodeId], 
        selectedEdgeId: null 
      };
    }
    // Replace selection
    return { selectedNodeIds: [nodeId], selectedEdgeId: null };
  }),
  
  // Select multiple nodes at once
  selectNodes: (nodeIds) => set({
    selectedNodeIds: nodeIds,
    selectedEdgeId: null,
  }),
  
  // Toggle a node's selection state
  toggleNodeSelection: (nodeId) => set((state) => {
    const isSelected = state.selectedNodeIds.includes(nodeId);
    if (isSelected) {
      return { 
        selectedNodeIds: state.selectedNodeIds.filter(id => id !== nodeId),
        selectedEdgeId: null,
      };
    }
    return { 
      selectedNodeIds: [...state.selectedNodeIds, nodeId],
      selectedEdgeId: null,
    };
  }),
  
  selectEdge: (edgeId) => set({
    selectedNodeIds: [],
    selectedEdgeId: edgeId,
  }),
  
  clearSelection: () => set({
    selectedNodeIds: [],
    selectedEdgeId: null,
  }),
  
  setMouseMode: (mode) => set({ mouseMode: mode }),
  
  // Inspector controls - only opens on explicit action (double-click)
  openInspector: () => set({ inspectorOpen: true }),
  closeInspector: () => set({ inspectorOpen: false }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setShowGroups: (show) => set({ showGroups: show }),
  
  clearGraph: () => set({
    nodes: [],
    edges: [],
    graphStyle: {},
    selectedNodeIds: [],
    selectedEdgeId: null,
    inspectorOpen: false,
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
      selectedNodeIds: [id],
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
    selectedNodeIds: state.selectedNodeIds.filter(id => id !== nodeId),
  })),
  
  deleteSelectedNodes: () => set((state) => {
    const selectedSet = new Set(state.selectedNodeIds);
    return {
      nodes: state.nodes.filter((n) => !selectedSet.has(n.id)),
      edges: state.edges.filter((e) => !selectedSet.has(e.source) && !selectedSet.has(e.target)),
      selectedNodeIds: [],
    };
  }),
  
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
      selectedNodeIds: [],
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
  
  // Group selected nodes into a new group
  groupSelectedNodes: () => {
    const state = useGraphStore.getState();
    const selectedIds = state.selectedNodeIds;
    
    // Need at least 2 nodes to create a group
    if (selectedIds.length < 2) return null;
    
    // Filter out any group nodes from selection (can't nest groups in groups for now)
    const selectedNodes = state.nodes.filter(
      (n) => selectedIds.includes(n.id) && n.type !== 'groupNode'
    );
    
    if (selectedNodes.length < 2) return null;
    
    // Calculate bounding box for the group
    const padding = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedNodes.forEach((node) => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      // Approximate node size
      maxX = Math.max(maxX, node.position.x + 200);
      maxY = Math.max(maxY, node.position.y + 100);
    });
    
    const groupId = `g${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const groupColors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
    const randomColor = groupColors[Math.floor(Math.random() * groupColors.length)];
    
    // Create the group node
    const groupNode: GraphNode = {
      id: groupId,
      type: 'groupNode',
      position: { x: minX - padding, y: minY - padding },
      style: {
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
      },
      data: {
        labels: ['Group'],
        properties: {},
        style: {
          borderColor: randomColor,
          backgroundColor: `${randomColor}10`,
        },
        isGroup: true,
        childNodeIds: selectedNodes.map((n) => n.id),
      },
    };
    
    // Update child nodes to reference the group and set their positions relative to group
    const updatedNodes = state.nodes.map((node) => {
      if (!selectedIds.includes(node.id) || node.type === 'groupNode') return node;
      
      const nodeData = node.data as SchemaNodeData;
      return {
        ...node,
        parentId: groupId,
        extent: 'parent' as const,
        position: {
          x: node.position.x - (minX - padding),
          y: node.position.y - (minY - padding),
        },
        data: {
          ...nodeData,
          groupId,
        },
      };
    });
    
    set({
      nodes: [groupNode, ...updatedNodes],
      selectedNodeIds: [groupId],
    });
    
    return groupId;
  },
  
  // Ungroup nodes - dissolve a group and free its children
  ungroupNodes: (groupId) => set((state) => {
    const groupNode = state.nodes.find((n) => n.id === groupId && n.type === 'groupNode');
    if (!groupNode) return state;
    
    const groupData = groupNode.data as SchemaNodeData;
    const childIds = new Set(groupData.childNodeIds || []);
    
    // Update child nodes: remove parent reference and convert to absolute positions
    const updatedNodes = state.nodes
      .filter((n) => n.id !== groupId) // Remove the group node
      .map((node) => {
        if (!childIds.has(node.id)) return node;
        
        const nodeData = node.data as SchemaNodeData;
        // Convert relative position back to absolute
        const absolutePosition = {
          x: node.position.x + groupNode.position.x,
          y: node.position.y + groupNode.position.y,
        };
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { parentId, extent, ...restNode } = node as GraphNode & { parentId?: string; extent?: string };
        
        return {
          ...restNode,
          position: absolutePosition,
          data: {
            ...nodeData,
            groupId: undefined,
          },
        } as GraphNode;
      });
    
    return {
      nodes: updatedNodes,
      selectedNodeIds: Array.from(childIds),
    };
  }),
}));

// Selectors
export const useNodes = () => useGraphStore((state) => state.nodes);
export const useEdges = () => useGraphStore((state) => state.edges);
export const useGraphStyle = () => useGraphStore((state) => state.graphStyle);
export const useSelectedNodeIds = () => useGraphStore((state) => state.selectedNodeIds);
export const useSelectedEdgeId = () => useGraphStore((state) => state.selectedEdgeId);
export const useInspectorOpen = () => useGraphStore((state) => state.inspectorOpen);
export const useMouseMode = () => useGraphStore((state) => state.mouseMode);
export const useIsLoading = () => useGraphStore((state) => state.isLoading);
export const useShowGroups = () => useGraphStore((state) => state.showGroups);

// For backwards compatibility and single-selection use cases
export const useSelectedNodeId = () => useGraphStore((state) => 
  state.selectedNodeIds.length === 1 ? state.selectedNodeIds[0] : null
);

// Get all selected nodes
export const useSelectedNodes = () => {
  const nodes = useNodes();
  const selectedIds = useSelectedNodeIds();
  const selectedSet = new Set(selectedIds);
  return nodes.filter((n) => selectedSet.has(n.id));
};

// Get single selected node (for inspector when only one is selected)
export const useSelectedNode = () => {
  const nodes = useNodes();
  const selectedIds = useSelectedNodeIds();
  if (selectedIds.length !== 1) return null;
  return nodes.find((n) => n.id === selectedIds[0]) || null;
};

export const useSelectedEdge = () => {
  const edges = useEdges();
  const selectedId = useSelectedEdgeId();
  return selectedId ? edges.find((e) => e.id === selectedId) : null;
};
