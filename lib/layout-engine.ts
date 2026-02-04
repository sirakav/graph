import dagre from 'dagre';
import type { SchemaNodeData, SchemaEdgeData, GraphNode, SchemaEdge } from './arrow-parser';

export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';
export type LayoutAlgorithm = 'hierarchical' | 'force' | 'radial' | 'grid';

interface LayoutOptions {
  direction?: LayoutDirection;
  nodeSpacing?: number;
  rankSpacing?: number;
  centerNodeId?: string; // For radial layout
  showGroups?: boolean; // When false, treat all non-group nodes as top-level
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

// Prepare nodes for layout when groups are hidden
// Filters out group nodes and removes parentId from children
function prepareNodesForFlatLayout(nodes: GraphNode[]): GraphNode[] {
  return nodes
    .filter(n => !isGroupNode(n))
    .map(n => {
      if (hasParent(n)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { parentId, extent, ...rest } = n as GraphNode & { parentId?: string; extent?: unknown };
        return rest as GraphNode;
      }
      return n;
    });
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
  const { direction = 'TB', nodeSpacing = 80, rankSpacing = 120, showGroups = true } = options;

  // When groups are hidden, treat all non-group nodes as top-level
  if (!showGroups) {
    const flatNodes = prepareNodesForFlatLayout(nodes);
    if (flatNodes.length === 0) return nodes;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: direction,
      nodesep: nodeSpacing,
      ranksep: rankSpacing,
      marginx: 50,
      marginy: 50,
    });

    const flatNodeIds = new Set(flatNodes.map(n => n.id));

    flatNodes.forEach((node) => {
      const size = getNodeDimensions(node);
      dagreGraph.setNode(node.id, {
        width: size.width,
        height: size.height,
      });
    });

    // Only include edges between visible nodes
    edges.filter(e => flatNodeIds.has(e.source) && flatNodeIds.has(e.target))
      .forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

    dagre.layout(dagreGraph);

    return flatNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const size = getNodeDimensions(node);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - size.width / 2,
          y: nodeWithPosition.y - size.height / 2,
        },
      };
    });
  }

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
  const { nodeSpacing = 200, showGroups = true } = options;
  
  // When groups are hidden, treat all non-group nodes as top-level
  const workingNodes = showGroups ? nodes : prepareNodesForFlatLayout(nodes);
  
  // 1. First layout all groups recursively (only when showing groups)
  const nodesWithGroupsLayouted = showGroups 
    ? layoutAllGroups(workingNodes, nodeSpacing)
    : workingNodes;
  
  // 2. Layout top-level nodes (all nodes when groups hidden)
  const topLevelNodes = getTopLevelNodes(nodesWithGroupsLayouted);
  
  if (topLevelNodes.length === 0) return showGroups ? nodesWithGroupsLayouted : nodes;

  // Sort nodes by ID for deterministic ordering
  const sortedNodes = [...topLevelNodes].sort((a, b) => a.id.localeCompare(b.id));

  const topLevelNodeIds = new Set(sortedNodes.map(n => n.id));
  const topLevelEdges = edges.filter(
    e => topLevelNodeIds.has(e.source) && topLevelNodeIds.has(e.target)
  );
  
  // Calculate ideal distance between connected nodes: spacing + average node dimension
  // This represents the gap we want between node edges
  const avgNodeSize = (DEFAULT_NODE_WIDTH + DEFAULT_NODE_HEIGHT) / 2;
  const idealEdgeDistance = nodeSpacing + avgNodeSize;
  
  // For repulsion, we want nodes to stay apart by at least this much
  // but we scale it down so the layout doesn't explode
  const minRepulsionDistance = avgNodeSize * 1.2; // Just enough to not overlap
  
  // Initialize positions DETERMINISTICALLY in a circle pattern
  // This ensures same input always produces same output
  const positions = new Map<string, { x: number; y: number }>();
  const initialRadius = Math.max(200, avgNodeSize * Math.sqrt(sortedNodes.length) * 0.8);
  
  sortedNodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / sortedNodes.length - Math.PI / 2;
    positions.set(node.id, {
      x: Math.cos(angle) * initialRadius,
      y: Math.sin(angle) * initialRadius,
    });
  });

  // Run force simulation iterations
  const iterations = 200;
  const damping = 0.85;

  // Initialize velocities
  const velocities = new Map<string, { vx: number; vy: number }>();
  sortedNodes.forEach((node) => {
    velocities.set(node.id, { vx: 0, vy: 0 });
  });

  for (let i = 0; i < iterations; i++) {
    // Temperature decreases over time for convergence
    const temperature = Math.max(0.01, 1 - (i / iterations));

    // Apply repulsion between all nodes
    // Use a gentler repulsion that only activates when nodes are too close
    sortedNodes.forEach((node1) => {
      const pos1 = positions.get(node1.id)!;
      const vel1 = velocities.get(node1.id)!;

      sortedNodes.forEach((node2) => {
        if (node1.id >= node2.id) return; // Process each pair once
        
        const pos2 = positions.get(node2.id)!;
        const vel2 = velocities.get(node2.id)!;
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Gentler repulsion: inverse square law but scaled down
        // Only significant when nodes are close
        const repulsionForce = (minRepulsionDistance * minRepulsionDistance) / (distance * distance) * 50;
        const fx = (dx / distance) * repulsionForce * temperature;
        const fy = (dy / distance) * repulsionForce * temperature;
        
        vel1.vx += fx;
        vel1.vy += fy;
        vel2.vx -= fx;
        vel2.vy -= fy;
      });
    });

    // Apply attraction for connected nodes (spring force)
    // This is the main driver of the layout - pulls connected nodes to idealEdgeDistance
    topLevelEdges.forEach((edge) => {
      const pos1 = positions.get(edge.source);
      const pos2 = positions.get(edge.target);
      if (!pos1 || !pos2) return;

      const vel1 = velocities.get(edge.source)!;
      const vel2 = velocities.get(edge.target)!;

      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      // Spring force: pull toward ideal distance
      // Stronger spring constant for better convergence
      const displacement = distance - idealEdgeDistance;
      const springForce = displacement * 0.15 * temperature;
      const fx = (dx / distance) * springForce;
      const fy = (dy / distance) * springForce;

      vel1.vx += fx;
      vel1.vy += fy;
      vel2.vx -= fx;
      vel2.vy -= fy;
    });

    // Gentle centering force to keep graph compact
    sortedNodes.forEach((node) => {
      const pos = positions.get(node.id)!;
      const vel = velocities.get(node.id)!;
      
      // Pull toward center
      vel.vx -= pos.x * 0.001 * temperature;
      vel.vy -= pos.y * 0.001 * temperature;
    });

    // Apply velocities and damping
    sortedNodes.forEach((node) => {
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
      const pos = positions.get(node.id);
      if (!pos) return node;
      const newPos = {
        x: pos.x - centerX + 500,
        y: pos.y - centerY + 400,
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
  const { centerNodeId, nodeSpacing = 200, showGroups = true } = options;
  
  // When groups are hidden, treat all non-group nodes as top-level
  const workingNodes = showGroups ? nodes : prepareNodesForFlatLayout(nodes);
  
  // 1. First layout all groups recursively (only when showing groups)
  const nodesWithGroupsLayouted = showGroups 
    ? layoutAllGroups(workingNodes, nodeSpacing)
    : workingNodes;
  
  // 2. Layout top-level nodes (all nodes when groups hidden)
  const topLevelNodes = getTopLevelNodes(nodesWithGroupsLayouted);
  
  if (topLevelNodes.length === 0) return showGroups ? nodesWithGroupsLayouted : nodes;

  // Sort nodes by ID for deterministic ordering
  const sortedNodes = [...topLevelNodes].sort((a, b) => a.id.localeCompare(b.id));

  // Find the center node - if not specified, use the first sorted node for determinism
  let centerNode = centerNodeId 
    ? sortedNodes.find((n) => n.id === centerNodeId)
    : undefined;
  if (!centerNode) centerNode = sortedNodes[0];

  const topLevelNodeIds = new Set(sortedNodes.map(n => n.id));
  const topLevelEdges = edges.filter(
    e => topLevelNodeIds.has(e.source) && topLevelNodeIds.has(e.target)
  );

  // Build adjacency list for top-level nodes
  const adjacency = new Map<string, Set<string>>();
  sortedNodes.forEach((node) => adjacency.set(node.id, new Set()));
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
    
    // Sort neighbors for deterministic BFS traversal
    const neighbors = Array.from(adjacency.get(current) || []).sort();
    neighbors.forEach((neighbor) => {
      if (!levels.has(neighbor)) {
        levels.set(neighbor, currentLevel + 1);
        queue.push(neighbor);
      }
    });
  }

  // Handle disconnected nodes - assign to outer ring
  sortedNodes.forEach((node) => {
    if (!levels.has(node.id)) {
      const maxLevel = levels.size > 0 ? Math.max(...Array.from(levels.values())) : 0;
      levels.set(node.id, maxLevel + 1);
    }
  });

  // Group nodes by level, sorted by ID within each level for determinism
  const nodesByLevel = new Map<number, string[]>();
  levels.forEach((level, nodeId) => {
    if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
    nodesByLevel.get(level)!.push(nodeId);
  });
  // Sort nodes within each level
  nodesByLevel.forEach((nodeIds) => {
    nodeIds.sort();
  });

  // Calculate spacing that accounts for node dimensions
  // This represents the actual gap between nodes
  const avgNodeSize = (DEFAULT_NODE_WIDTH + DEFAULT_NODE_HEIGHT) / 2;
  const effectiveSpacing = nodeSpacing + avgNodeSize;

  // Position nodes in concentric circles
  const positions = new Map<string, { x: number; y: number }>();
  
  // Track cumulative radius to account for different node counts per level
  let cumulativeRadius = 0;
  
  // Get sorted levels
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
  
  sortedLevels.forEach((level) => {
    const nodeIds = nodesByLevel.get(level)!;
    
    if (level === 0) {
      positions.set(nodeIds[0], { x: 0, y: 0 });
      // Initial radius is based on the gap we want from center
      cumulativeRadius = effectiveSpacing;
    } else {
      // Calculate minimum radius needed to fit all nodes at this level
      // Circumference needed = nodeCount * (nodeWidth + spacing)
      const circumferenceNeeded = nodeIds.length * (DEFAULT_NODE_WIDTH + nodeSpacing);
      const minRadiusForNodes = circumferenceNeeded / (2 * Math.PI);
      
      // Use the larger of: cumulative radius or minimum radius for this level's nodes
      const radius = Math.max(cumulativeRadius, minRadiusForNodes);
      
      const angleStep = (2 * Math.PI) / nodeIds.length;
      
      nodeIds.forEach((nodeId, index) => {
        const angle = index * angleStep - Math.PI / 2;
        positions.set(nodeId, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      });
      
      // Update cumulative radius for next level
      cumulativeRadius = radius + effectiveSpacing;
    }
  });

  // Calculate center offset based on bounding box
  const xs = Array.from(positions.values()).map((p) => p.x);
  const ys = Array.from(positions.values()).map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  return nodesWithGroupsLayouted.map((node) => {
    if (hasParent(node)) {
      return node;
    } else {
      const pos = positions.get(node.id) || { x: 0, y: 0 };
      const newPos = {
        x: pos.x - minX + 50,
        y: pos.y - minY + 50,
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
  const { nodeSpacing = 250, showGroups = true } = options;
  
  // When groups are hidden, treat all non-group nodes as top-level
  const workingNodes = showGroups ? nodes : prepareNodesForFlatLayout(nodes);
  
  // 1. First layout all groups recursively (only when showing groups)
  const nodesWithGroupsLayouted = showGroups 
    ? layoutAllGroups(workingNodes, nodeSpacing)
    : workingNodes;
  
  // 2. Layout top-level nodes (all nodes when groups hidden)
  const topLevelNodes = getTopLevelNodes(nodesWithGroupsLayouted);
  
  if (topLevelNodes.length === 0) return showGroups ? nodesWithGroupsLayouted : nodes;
  
  // Sort nodes by ID for deterministic ordering
  const sortedNodes = [...topLevelNodes].sort((a, b) => a.id.localeCompare(b.id));
  
  const columns = Math.ceil(Math.sqrt(sortedNodes.length));
  
  // Create position map for top-level nodes
  // Spacing represents the GAP between nodes, so we add node dimensions
  const topLevelPositions = new Map<string, { x: number; y: number }>();
  sortedNodes.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    
    // Calculate cell size: node dimension + spacing (gap)
    const cellWidth = DEFAULT_NODE_WIDTH + nodeSpacing;
    const cellHeight = DEFAULT_NODE_HEIGHT + nodeSpacing;
    
    topLevelPositions.set(node.id, {
      x: col * cellWidth + 50,
      y: row * cellHeight + 50,
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
