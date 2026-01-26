import dagre from 'dagre';
import type { SchemaNodeData, SchemaEdgeData, GraphNode, SchemaEdge } from './arrow-parser';

export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';
export type LayoutAlgorithm = 'hierarchical' | 'force' | 'radial' | 'grid';

interface LayoutOptions {
  direction?: LayoutDirection;
  nodeSpacing?: number;
  rankSpacing?: number;
  centerNodeId?: string; // For radial layout
}

const DEFAULT_NODE_WIDTH = 300;
const DEFAULT_NODE_HEIGHT = 200;

// Helper to check if a node has a parent (is grouped)
function hasParent(node: GraphNode): boolean {
  return 'parentId' in node && node.parentId !== undefined;
}

// Helper to check if a node is a group
function isGroupNode(node: GraphNode): boolean {
  return node.data?.isGroup === true;
}

// Get top-level nodes only (no parent)
function getTopLevelNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter(n => !hasParent(n));
}

// Get children of a specific group
function getGroupChildren(nodes: GraphNode[], groupId: string): GraphNode[] {
  return nodes.filter(n => 'parentId' in n && n.parentId === groupId);
}

// Helper to get node dimensions (including groups)
function getNodeDimensions(node: GraphNode): { width: number; height: number } {
  if (isGroupNode(node)) {
    const style = node.style as any;
    if (style?.width && style?.height) {
      return { width: style.width, height: style.height };
    }
    return { width: 300, height: 200 };
  }
  // For regular nodes, use constants
  return { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
}

// Recursively layout a group and its children
function layoutGroupRecursive(
  nodesMap: Map<string, GraphNode>,
  groupId: string,
  spacing: number
): void {
  const groupNode = nodesMap.get(groupId);
  if (!groupNode) return;

  const children = getGroupChildren(Array.from(nodesMap.values()), groupId);
  
  if (children.length === 0) {
     // Even if empty, give it a default size
     const newGroupNode = {
        ...groupNode,
        style: {
          ...(groupNode.style as object),
          width: 300,
          height: 200
        }
      };
      nodesMap.set(groupId, newGroupNode);
      return;
  }

  // 1. Recursively layout nested groups first
  children.forEach(child => {
    if (isGroupNode(child)) {
      layoutGroupRecursive(nodesMap, child.id, spacing);
    }
  });

  // 2. Layout direct children (nodes and now-sized groups)
  // Re-fetch children from map to get updated dimensions/positions
  const updatedChildren = children.map(c => nodesMap.get(c.id)!);

  // Simple Flow Layout
  const PADDING = 40;
  const HEADER_HEIGHT = 60;
  const GAP = spacing;
  
  // Calculate target width based on total area to maintain aspect ratio
  let totalArea = 0;
  updatedChildren.forEach(child => {
    const dims = getNodeDimensions(child);
    totalArea += (dims.width + GAP) * (dims.height + GAP);
  });
  // Heuristic: make it roughly square or slightly wider
  const targetWidth = Math.max(600, Math.sqrt(totalArea) * 1.6); 

  let currentX = PADDING;
  let currentY = HEADER_HEIGHT + PADDING;
  let rowHeight = 0;
  let maxRowWidth = 0;

  updatedChildren.forEach(child => {
    const dims = getNodeDimensions(child);
    
    // Check wrap
    if (currentX + dims.width > targetWidth && currentX > PADDING) {
      currentX = PADDING;
      currentY += rowHeight + GAP;
      rowHeight = 0;
    }

    // Update child position (relative to parent group)
    const newChild = {
      ...child,
      position: { x: currentX, y: currentY }
    };
    nodesMap.set(child.id, newChild);
    
    // Update stats
    rowHeight = Math.max(rowHeight, dims.height);
    maxRowWidth = Math.max(maxRowWidth, currentX + dims.width);
    currentX += dims.width + GAP;
  });

  const totalHeight = currentY + rowHeight + PADDING;
  const totalWidth = Math.max(maxRowWidth, currentX) + PADDING;

  // Update group node dimensions
  const newGroupNode = {
    ...groupNode,
    style: {
      ...(groupNode.style as object),
      width: totalWidth,
      height: totalHeight
    }
  };
  nodesMap.set(groupId, newGroupNode);
}

// Recursively layout all groups and their contents
function layoutAllGroups(
  nodes: GraphNode[],
  spacing: number
): GraphNode[] {
  const nodesMap = new Map(nodes.map(n => [n.id, n]));
  
  // Find top-level groups (groups that don't have a parent that is also in the nodes list)
  // Actually, we can just find all groups that don't have a parentId, or whose parentId is not in the nodes list.
  // But for simplicity, we iterate all groups that are roots in the hierarchy.
  const topLevelGroups = nodes.filter(n => isGroupNode(n) && !hasParent(n));
  
  topLevelGroups.forEach(group => {
    layoutGroupRecursive(nodesMap, group.id, spacing);
  });
  
  return Array.from(nodesMap.values());
}

// Hierarchical layout using dagre
export function applyHierarchicalLayout(
  nodes: GraphNode[],
  edges: SchemaEdge[],
  options: LayoutOptions = {}
): GraphNode[] {
  const { direction = 'TB', nodeSpacing = 80, rankSpacing = 120 } = options;

  // 1. First layout all groups recursively (bottom-up)
  // This updates dimensions of groups and relative positions of children
  const nodesWithGroupsLayouted = layoutAllGroups(nodes, nodeSpacing);

  // 2. Now layout top-level nodes using Dagre
  const topLevelNodes = getTopLevelNodes(nodesWithGroupsLayouted);
  
  if (topLevelNodes.length === 0) return nodesWithGroupsLayouted;

  // Filter edges to only include those between top-level nodes
  const topLevelNodeIds = new Set(topLevelNodes.map(n => n.id));
  const topLevelEdges = edges.filter(
    e => topLevelNodeIds.has(e.source) && topLevelNodeIds.has(e.target)
  );

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
    marginx: 50,
    marginy: 50,
  });

  // Add only top-level nodes to dagre graph with appropriate sizes
  topLevelNodes.forEach((node) => {
    const size = getNodeDimensions(node);
    dagreGraph.setNode(node.id, {
      width: size.width,
      height: size.height,
    });
  });

  // Add edges between top-level nodes to dagre graph
  topLevelEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Create a map of new positions for top-level nodes
  const newPositions = new Map<string, { x: number; y: number }>();
  topLevelNodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const size = getNodeDimensions(node);
    newPositions.set(node.id, {
      x: nodeWithPosition.x - size.width / 2,
      y: nodeWithPosition.y - size.height / 2,
    });
  });

  // Apply new positions to top-level nodes
  return nodesWithGroupsLayouted.map((node) => {
    if (hasParent(node)) {
      // Child positions were already updated by layoutAllGroups (relative to parent)
      return node;
    } else {
      // Top-level nodes get new positions from dagre
      const newPos = newPositions.get(node.id);
      if (newPos) {
        return { ...node, position: newPos };
      }
      return node;
    }
  });
}

// Simple force-directed layout simulation
export function applyForceLayout(
  nodes: GraphNode[],
  edges: SchemaEdge[],
  options: LayoutOptions = {}
): GraphNode[] {
  const { nodeSpacing = 200 } = options;
  
  // 1. First layout all groups recursively
  const nodesWithGroupsLayouted = layoutAllGroups(nodes, nodeSpacing);
  
  // 2. Layout top-level nodes
  const topLevelNodes = getTopLevelNodes(nodesWithGroupsLayouted);
  
  if (topLevelNodes.length === 0) return nodesWithGroupsLayouted;

  const topLevelNodeIds = new Set(topLevelNodes.map(n => n.id));
  const topLevelEdges = edges.filter(
    e => topLevelNodeIds.has(e.source) && topLevelNodeIds.has(e.target)
  );
  
  // Create a map of node positions for top-level nodes only
  const positions = new Map<string, { x: number; y: number }>();
  topLevelNodes.forEach((node) => {
    positions.set(node.id, { ...node.position });
  });

  // Run force simulation iterations
  const iterations = 100;
  const repulsionStrength = nodeSpacing * nodeSpacing;
  const attractionStrength = 0.1;
  const damping = 0.95;

  // Initialize velocities
  const velocities = new Map<string, { vx: number; vy: number }>();
  topLevelNodes.forEach((node) => {
    velocities.set(node.id, { vx: 0, vy: 0 });
  });

  for (let i = 0; i < iterations; i++) {
    const temperature = 1 - i / iterations;

    // Apply repulsion between all top-level nodes
    topLevelNodes.forEach((node1) => {
      const pos1 = positions.get(node1.id)!;
      const vel1 = velocities.get(node1.id)!;

      topLevelNodes.forEach((node2) => {
        if (node1.id === node2.id) return;
        
        const pos2 = positions.get(node2.id)!;
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = repulsionStrength / (distance * distance);
        vel1.vx += (dx / distance) * force * temperature;
        vel1.vy += (dy / distance) * force * temperature;
      });
    });

    // Apply attraction for connected nodes
    topLevelEdges.forEach((edge) => {
      const pos1 = positions.get(edge.source);
      const pos2 = positions.get(edge.target);
      if (!pos1 || !pos2) return;

      const vel1 = velocities.get(edge.source)!;
      const vel2 = velocities.get(edge.target)!;

      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = distance * attractionStrength * temperature;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      vel1.vx += fx;
      vel1.vy += fy;
      vel2.vx -= fx;
      vel2.vy -= fy;
    });

    // Apply velocities and damping
    topLevelNodes.forEach((node) => {
      const pos = positions.get(node.id)!;
      const vel = velocities.get(node.id)!;

      pos.x += vel.vx;
      pos.y += vel.vy;
      vel.vx *= damping;
      vel.vy *= damping;
    });
  }

  // Center the graph
  const xs = Array.from(positions.values()).map((p) => p.x);
  const ys = Array.from(positions.values()).map((p) => p.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  return nodesWithGroupsLayouted.map((node) => {
    if (hasParent(node)) {
      return node;
    } else {
      const pos = positions.get(node.id)!;
      const newPos = {
        x: pos.x - centerX + 400,
        y: pos.y - centerY + 300,
      };
      return { ...node, position: newPos };
    }
  });
}

// Radial layout centered around a specific node
export function applyRadialLayout(
  nodes: GraphNode[],
  edges: SchemaEdge[],
  options: LayoutOptions = {}
): GraphNode[] {
  const { centerNodeId, nodeSpacing = 200 } = options;
  
  // 1. First layout all groups recursively
  const nodesWithGroupsLayouted = layoutAllGroups(nodes, nodeSpacing);
  
  // 2. Layout top-level nodes
  const topLevelNodes = getTopLevelNodes(nodesWithGroupsLayouted);
  
  if (topLevelNodes.length === 0) return nodesWithGroupsLayouted;

  // Find the center node
  let centerNode = centerNodeId 
    ? topLevelNodes.find((n) => n.id === centerNodeId)
    : undefined;
  if (!centerNode) centerNode = topLevelNodes[0];

  const topLevelNodeIds = new Set(topLevelNodes.map(n => n.id));
  const topLevelEdges = edges.filter(
    e => topLevelNodeIds.has(e.source) && topLevelNodeIds.has(e.target)
  );

  // Build adjacency list for top-level nodes
  const adjacency = new Map<string, Set<string>>();
  topLevelNodes.forEach((node) => adjacency.set(node.id, new Set()));
  topLevelEdges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  // BFS to find levels from center
  const levels = new Map<string, number>();
  const queue: string[] = [centerNode.id];
  levels.set(centerNode.id, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current)!;
    
    adjacency.get(current)?.forEach((neighbor) => {
      if (!levels.has(neighbor)) {
        levels.set(neighbor, currentLevel + 1);
        queue.push(neighbor);
      }
    });
  }

  // Handle disconnected nodes
  topLevelNodes.forEach((node) => {
    if (!levels.has(node.id)) {
      const maxLevel = levels.size > 0 ? Math.max(...Array.from(levels.values())) : 0;
      levels.set(node.id, maxLevel + 1);
    }
  });

  // Group nodes by level
  const nodesByLevel = new Map<number, string[]>();
  levels.forEach((level, nodeId) => {
    if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
    nodesByLevel.get(level)!.push(nodeId);
  });

  // Position nodes in concentric circles
  const positions = new Map<string, { x: number; y: number }>();
  
  nodesByLevel.forEach((nodeIds, level) => {
    if (level === 0) {
      positions.set(nodeIds[0], { x: 0, y: 0 });
    } else {
      const radius = level * nodeSpacing;
      const angleStep = (2 * Math.PI) / nodeIds.length;
      
      nodeIds.forEach((nodeId, index) => {
        const angle = index * angleStep - Math.PI / 2;
        positions.set(nodeId, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      });
    }
  });

  return nodesWithGroupsLayouted.map((node) => {
    if (hasParent(node)) {
      return node;
    } else {
      const pos = positions.get(node.id) || { x: 0, y: 0 };
      const newPos = {
        x: pos.x + 500,
        y: pos.y + 400,
      };
      return { ...node, position: newPos };
    }
  });
}

// Grid layout - simple arrangement in a grid
export function applyGridLayout(
  nodes: GraphNode[],
  options: LayoutOptions = {}
): GraphNode[] {
  const { nodeSpacing = 250 } = options;
  
  // 1. First layout all groups recursively
  const nodesWithGroupsLayouted = layoutAllGroups(nodes, nodeSpacing);
  
  // 2. Layout top-level nodes
  const topLevelNodes = getTopLevelNodes(nodesWithGroupsLayouted);
  
  if (topLevelNodes.length === 0) return nodesWithGroupsLayouted;
  
  const columns = Math.ceil(Math.sqrt(topLevelNodes.length));
  
  // Create position map for top-level nodes
  const topLevelPositions = new Map<string, { x: number; y: number }>();
  topLevelNodes.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    topLevelPositions.set(node.id, {
      x: col * nodeSpacing + 50,
      y: row * nodeSpacing + 50,
    });
  });
  
  return nodesWithGroupsLayouted.map((node) => {
    if (hasParent(node)) {
      return node;
    } else {
      const pos = topLevelPositions.get(node.id);
      if (pos) {
        return { ...node, position: pos };
      }
      return node;
    }
  });
}

// Main layout function that dispatches to the appropriate algorithm
export function applyLayout(
  nodes: GraphNode[],
  edges: SchemaEdge[],
  algorithm: LayoutAlgorithm,
  options: LayoutOptions = {}
): GraphNode[] {
  switch (algorithm) {
    case 'hierarchical':
      return applyHierarchicalLayout(nodes, edges, options);
    case 'force':
      return applyForceLayout(nodes, edges, options);
    case 'radial':
      return applyRadialLayout(nodes, edges, options);
    case 'grid':
      return applyGridLayout(nodes, options);
    default:
      return nodes;
  }
}
