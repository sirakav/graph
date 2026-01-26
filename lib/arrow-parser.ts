import type { Node, Edge } from '@xyflow/react';

// Types for Arrow Graph JSON format
export interface ArrowNode {
  id: string;
  position: { x: number; y: number };
  labels: string[];
  properties: Record<string, unknown>;
  style: {
    'border-color'?: string;
    'node-color'?: string;
  };
  // Grouping support (optional for backward compatibility)
  group?: string;      // Parent group ID
  isGroup?: boolean;   // Marks this node as a group container
}

export interface ArrowRelationship {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  properties: Record<string, unknown>;
  style: Record<string, unknown>;
}

export interface ArrowGraphStyle {
  'font-family'?: string;
  'background-color'?: string;
  'node-color'?: string;
  'border-width'?: number;
  'border-color'?: string;
  radius?: number;
  'arrow-color'?: string;
  'arrow-width'?: number;
  [key: string]: unknown;
}

export interface ArrowGraph {
  nodes: ArrowNode[];
  relationships: ArrowRelationship[];
  style: ArrowGraphStyle;
}

// React Flow node data type - with index signature for compatibility
export interface SchemaNodeData {
  labels: string[];
  properties: Record<string, unknown>;
  style: {
    borderColor: string;
    backgroundColor: string;
  };
  // Grouping support
  isGroup?: boolean;       // Whether this node is a group container
  groupId?: string;        // The parent group ID (if this node belongs to a group)
  childNodeIds?: string[]; // IDs of child nodes (for group nodes)
  [key: string]: unknown;  // Index signature for React Flow compatibility
}

// React Flow edge data type - with index signature for compatibility
export interface SchemaEdgeData {
  relationshipType: string;
  properties: Record<string, unknown>;
  [key: string]: unknown; // Index signature for React Flow compatibility
}

// Type aliases for React Flow
export type SchemaNode = Node<SchemaNodeData, 'schemaNode'>;
export type GroupNode = Node<SchemaNodeData, 'groupNode'>;
export type GraphNode = SchemaNode | GroupNode;
export type SchemaEdge = Edge<SchemaEdgeData, 'schemaEdge'>;

// Transform Arrow Graph JSON to React Flow format
export function parseArrowGraph(arrowGraph: ArrowGraph): {
  nodes: GraphNode[];
  edges: SchemaEdge[];
  graphStyle: ArrowGraphStyle;
} {
  const defaultNodeColor = arrowGraph.style['node-color'] || '#4C8EDA';
  const defaultBorderColor = arrowGraph.style['border-color'] || '#000000';

  // Build a map of group ID to child node IDs
  const groupChildrenMap = new Map<string, string[]>();
  arrowGraph.nodes.forEach((node) => {
    if (node.group) {
      const children = groupChildrenMap.get(node.group) || [];
      children.push(node.id);
      groupChildrenMap.set(node.group, children);
    }
  });

  // Create a map of all nodes for quick lookup
  const nodeMap = new Map(arrowGraph.nodes.map((n) => [n.id, n]));

  // Calculate the absolute position of a node (following parent chain)
  function getAbsolutePosition(nodeId: string): { x: number; y: number } {
    const node = nodeMap.get(nodeId);
    if (!node) return { x: 0, y: 0 };
    
    if (node.group) {
      const parentPos = getAbsolutePosition(node.group);
      return {
        x: parentPos.x + node.position.x,
        y: parentPos.y + node.position.y,
      };
    }
    return { x: node.position.x, y: node.position.y };
  }

  // Layout children of a group in a grid with proper spacing
  function layoutChildrenInGrid(groupId: string): Map<string, { x: number; y: number }> {
    const children = (groupChildrenMap.get(groupId) || [])
      .map(id => nodeMap.get(id))
      .filter((n): n is ArrowNode => n !== undefined && !n.isGroup);
    
    const positions = new Map<string, { x: number; y: number }>();
    if (children.length === 0) return positions;
    
    // Calculate grid dimensions - prefer wider than tall
    const cols = Math.ceil(Math.sqrt(children.length * 1.5));
    const nodeWidth = 200;
    const nodeHeight = 160;
    const gapX = 80;
    const gapY = 40;
    
    children.forEach((child, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      positions.set(child.id, {
        x: col * (nodeWidth + gapX) + 50,
        y: row * (nodeHeight + gapY) + 80, // Leave space for group header
      });
    });
    
    return positions;
  }

  // Pre-calculate grid positions for all group children
  const childGridPositions = new Map<string, { x: number; y: number }>();
  arrowGraph.nodes.filter(n => n.isGroup).forEach(group => {
    const positions = layoutChildrenInGrid(group.id);
    positions.forEach((pos, id) => childGridPositions.set(id, pos));
  });

  // Calculate bounding box for a group based on its children (using grid positions)
  function calculateGroupBounds(groupId: string): { 
    width: number;
    height: number;
  } {
    const children = groupChildrenMap.get(groupId) || [];
    
    if (children.length === 0) {
      return { 
        width: 300,
        height: 200,
      };
    }

    // Same dimensions used in layoutChildrenInGrid
    const nodeWidth = 200;
    const nodeHeight = 160;
    const nestedGroupStartX = 40;
    const nestedGroupStartY = 60;
    
    let maxChildX = 0;
    let maxChildY = 0;

    for (const childId of children) {
      const child = nodeMap.get(childId);
      if (!child) continue;
      
      if (child.isGroup) {
        // For nested groups, get their bounds recursively
        // Nested groups are positioned at (40, 60) within their parent
        const childBounds = calculateGroupBounds(childId);
        maxChildX = Math.max(maxChildX, nestedGroupStartX + childBounds.width);
        maxChildY = Math.max(maxChildY, nestedGroupStartY + childBounds.height);
      } else {
        // Use the grid position we calculated
        const gridPos = childGridPositions.get(childId);
        if (gridPos) {
          maxChildX = Math.max(maxChildX, gridPos.x + nodeWidth);
          maxChildY = Math.max(maxChildY, gridPos.y + nodeHeight);
        }
      }
    }

    // Add padding for breathing room
    const horizontalPadding = 60;
    const bottomPadding = 50;
    
    return {
      width: maxChildX + horizontalPadding,
      height: maxChildY + bottomPadding,
    };
  }

  // Sort nodes so that parent groups come before their children
  // This is required by React Flow for proper parent-child rendering
  const sortedNodes = topologicalSortByGroup(arrowGraph.nodes);

  // Pre-calculate group dimensions
  const groupDimensions = new Map<string, { width: number; height: number }>();
  sortedNodes.forEach((node) => {
    if (node.isGroup) {
      groupDimensions.set(node.id, calculateGroupBounds(node.id));
    }
  });

  const nodes: GraphNode[] = sortedNodes.map((node) => {
    const isGroup = node.isGroup === true;
    const childNodeIds = groupChildrenMap.get(node.id) || [];
    
    // Calculate position
    let position = { x: node.position.x, y: node.position.y };
    
    if (node.group && !isGroup) {
      // For non-group children, use the pre-calculated grid position
      const gridPos = childGridPositions.get(node.id);
      if (gridPos) {
        position = gridPos;
      }
    } else if (node.group && isGroup) {
      // Nested groups - position relative to parent
      position = { x: 40, y: 60 };
    } else if (isGroup && !node.group) {
      // Top-level groups keep their original position
      position = { x: node.position.x, y: node.position.y };
    }
    
    const baseNode = {
      id: node.id,
      type: isGroup ? ('groupNode' as const) : ('schemaNode' as const),
      position,
      data: {
        labels: node.labels,
        properties: node.properties,
        style: {
          borderColor: node.style['border-color'] || defaultBorderColor,
          backgroundColor: node.style['node-color'] || defaultNodeColor,
        },
        isGroup,
        groupId: node.group,
        childNodeIds: isGroup ? childNodeIds : undefined,
      },
      // Add dimensions for group nodes
      ...(isGroup && groupDimensions.has(node.id) ? {
        style: { 
          width: groupDimensions.get(node.id)!.width,
          height: groupDimensions.get(node.id)!.height,
        },
      } : {}),
    };

    // Add parent relationship for React Flow
    if (node.group) {
      return {
        ...baseNode,
        parentId: node.group,
        extent: 'parent' as const, // Constrain node within parent bounds
      };
    }

    return baseNode;
  });

  const edges: SchemaEdge[] = arrowGraph.relationships.map((rel) => ({
    id: rel.id,
    source: rel.fromId,
    target: rel.toId,
    type: 'schemaEdge' as const,
    data: {
      relationshipType: rel.type,
      properties: rel.properties,
    },
  }));

  return {
    nodes,
    edges,
    graphStyle: arrowGraph.style,
  };
}

// Topologically sort nodes so parents come before children
// This is required by React Flow for proper parent-child relationships
function topologicalSortByGroup(nodes: ArrowNode[]): ArrowNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const result: ArrowNode[] = [];

  // Get the depth of a node in the group hierarchy
  function getDepth(node: ArrowNode): number {
    let depth = 0;
    let current = node;
    while (current.group) {
      depth++;
      const parent = nodeMap.get(current.group);
      if (!parent) break;
      current = parent;
    }
    return depth;
  }

  // Sort by depth (parents first, then children)
  const sortedByDepth = [...nodes].sort((a, b) => getDepth(a) - getDepth(b));

  return sortedByDepth;
}

// Validate Arrow Graph JSON structure
export function isValidArrowGraph(data: unknown): data is ArrowGraph {
  if (!data || typeof data !== 'object') return false;
  
  const graph = data as Record<string, unknown>;
  
  if (!Array.isArray(graph.nodes)) return false;
  if (!Array.isArray(graph.relationships)) return false;
  
  // Build a set of all node IDs for group reference validation
  const nodeIds = new Set<string>();
  
  // Validate nodes have required fields
  for (const node of graph.nodes) {
    if (typeof node !== 'object' || node === null) return false;
    const n = node as Record<string, unknown>;
    if (typeof n.id !== 'string') return false;
    if (!n.position || typeof n.position !== 'object') return false;
    const pos = n.position as Record<string, unknown>;
    if (typeof pos.x !== 'number' || typeof pos.y !== 'number') return false;
    
    // Optional group fields validation
    if (n.group !== undefined && typeof n.group !== 'string') return false;
    if (n.isGroup !== undefined && typeof n.isGroup !== 'boolean') return false;
    
    nodeIds.add(n.id);
  }
  
  // Validate group references point to existing nodes
  for (const node of graph.nodes) {
    const n = node as Record<string, unknown>;
    if (n.group && !nodeIds.has(n.group as string)) {
      console.warn(`Node "${n.id}" references non-existent group "${n.group}"`);
      // Don't fail validation, just warn - allows partial imports
    }
  }
  
  // Validate relationships have required fields
  for (const rel of graph.relationships) {
    if (typeof rel !== 'object' || rel === null) return false;
    const r = rel as Record<string, unknown>;
    if (typeof r.id !== 'string') return false;
    if (typeof r.fromId !== 'string') return false;
    if (typeof r.toId !== 'string') return false;
  }
  
  return true;
}

// Parse JSON string and return Arrow Graph
export function parseArrowGraphFromJSON(jsonString: string): ArrowGraph | null {
  try {
    const data = JSON.parse(jsonString);
    if (isValidArrowGraph(data)) {
      // Ensure default values while preserving optional group fields
      return {
        nodes: data.nodes.map((node) => ({
          ...node,
          labels: node.labels || [],
          properties: node.properties || {},
          style: node.style || {},
          // Preserve optional grouping fields (backward compatible)
          group: node.group,
          isGroup: node.isGroup,
        })),
        relationships: data.relationships.map((rel) => ({
          ...rel,
          type: rel.type || '',
          properties: rel.properties || {},
          style: rel.style || {},
        })),
        style: data.style || {},
      };
    }
    return null;
  } catch {
    return null;
  }
}
