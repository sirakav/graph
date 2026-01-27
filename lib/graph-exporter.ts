import type { GraphNode, SchemaEdge, ArrowGraph, ArrowGraphStyle } from './arrow-parser';
import type { SavedQuery } from './saved-queries-store';

export type ExportFormat = 'arrow' | 'cypher' | 'protobuf' | 'graphql';

export interface ExportOptions {
  format: ExportFormat;
  includePositions?: boolean; // For Arrow format
  includeStyles?: boolean;    // For Arrow format
  includeQueries?: boolean;   // For Arrow format
  schemaName?: string;        // For Protobuf/GraphQL
  queries?: SavedQuery[];     // Queries to include in export
}

/**
 * Convert internal graph representation to ArrowGraph format
 */
export function toArrowGraph(
  nodes: GraphNode[],
  edges: SchemaEdge[],
  graphStyle: ArrowGraphStyle = {},
  queries?: SavedQuery[]
): ArrowGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      position: node.position,
      labels: node.data.labels || [],
      properties: node.data.properties || {},
      style: {
        'border-color': node.data.style?.borderColor,
        'node-color': node.data.style?.backgroundColor,
      },
      group: node.data.groupId,
      isGroup: node.data.isGroup,
    })),
    relationships: edges.map((edge) => ({
      id: edge.id,
      fromId: edge.source,
      toId: edge.target,
      type: edge.data?.relationshipType || '',
      properties: edge.data?.properties || {},
      style: {},
    })),
    style: graphStyle || {},
    queries: queries && queries.length > 0 ? queries : undefined,
  };
}

/**
 * Export to Arrow JSON format
 */
export function exportToArrow(
  nodes: GraphNode[],
  edges: SchemaEdge[],
  graphStyle: ArrowGraphStyle = {},
  options: { includePositions?: boolean; includeStyles?: boolean; includeQueries?: boolean; queries?: SavedQuery[] } = {}
): string {
  const { includePositions = true, includeStyles = true, includeQueries = true, queries } = options;
  
  const arrowGraph = toArrowGraph(nodes, edges, graphStyle, includeQueries ? queries : undefined);
  
  // Optionally strip positions
  if (!includePositions) {
    arrowGraph.nodes = arrowGraph.nodes.map((node) => ({
      ...node,
      position: { x: 0, y: 0 },
    }));
  }
  
  // Optionally strip styles
  if (!includeStyles) {
    arrowGraph.nodes = arrowGraph.nodes.map((node) => ({
      ...node,
      style: {},
    }));
    arrowGraph.relationships = arrowGraph.relationships.map((rel) => ({
      ...rel,
      style: {},
    }));
    arrowGraph.style = {};
  }
  
  return JSON.stringify(arrowGraph, null, 2);
}

/**
 * Generate Cypher CREATE statements for Neo4j
 */
export function exportToCypher(
  nodes: GraphNode[],
  edges: SchemaEdge[]
): string {
  const lines: string[] = [];
  
  // Header comment
  lines.push('// Generated Cypher Schema');
  lines.push('// ======================');
  lines.push('');
  
  // Create nodes with their labels and properties
  lines.push('// --- Nodes ---');
  lines.push('');
  
  // Group regular nodes and group nodes
  const regularNodes = nodes.filter(n => !n.data.isGroup);
  const groupNodes = nodes.filter(n => n.data.isGroup);
  
  // Add comments for groups
  if (groupNodes.length > 0) {
    lines.push('// Group containers (for documentation):');
    groupNodes.forEach((node) => {
      const labels = node.data.labels?.length ? node.data.labels.join(':') : 'Node';
      lines.push(`// - ${labels} (contains grouped nodes)`);
    });
    lines.push('');
  }
  
  regularNodes.forEach((node) => {
    const labels = node.data.labels?.length ? node.data.labels.join(':') : 'Node';
    const varName = sanitizeVariableName(node.id);
    const properties = node.data.properties || {};
    
    let propsStr = '';
    if (Object.keys(properties).length > 0) {
      const propEntries = Object.entries(properties)
        .map(([key, value]) => `${sanitizePropertyName(key)}: ${formatCypherValue(value)}`)
        .join(', ');
      propsStr = ` {${propEntries}}`;
    }
    
    lines.push(`CREATE (${varName}:${labels}${propsStr})`);
  });
  
  if (edges.length > 0) {
    lines.push('');
    lines.push('// --- Relationships ---');
    lines.push('');
    
    edges.forEach((edge) => {
      const sourceVar = sanitizeVariableName(edge.source);
      const targetVar = sanitizeVariableName(edge.target);
      const relType = edge.data?.relationshipType || 'RELATES_TO';
      const properties = edge.data?.properties || {};
      
      let propsStr = '';
      if (Object.keys(properties).length > 0) {
        const propEntries = Object.entries(properties)
          .map(([key, value]) => `${sanitizePropertyName(key)}: ${formatCypherValue(value)}`)
          .join(', ');
        propsStr = ` {${propEntries}}`;
      }
      
      lines.push(`CREATE (${sourceVar})-[:${sanitizeRelationType(relType)}${propsStr}]->(${targetVar})`);
    });
  }
  
  lines.push('');
  lines.push(';');
  
  return lines.join('\n');
}

/**
 * Export to Protocol Buffers schema definition (nodes only)
 */
export function exportToProtobuf(
  nodes: GraphNode[],
  _edges: SchemaEdge[],
  schemaName: string = 'GraphSchema'
): string {
  const lines: string[] = [];
  
  lines.push('syntax = "proto3";');
  lines.push('');
  lines.push(`package ${sanitizePackageName(schemaName)};`);
  lines.push('');
  lines.push('// Generated Protocol Buffers Schema');
  lines.push('// ==================================');
  lines.push('');
  
  // Collect unique node types (by label combinations)
  const nodeTypes = new Map<string, { labels: string[]; properties: Record<string, unknown> }>();
  
  nodes.filter(n => !n.data.isGroup).forEach((node) => {
    const labels = node.data.labels || ['Node'];
    const key = labels.join('_');
    const existing = nodeTypes.get(key);
    
    if (existing) {
      // Merge properties
      nodeTypes.set(key, {
        labels,
        properties: { ...existing.properties, ...node.data.properties },
      });
    } else {
      nodeTypes.set(key, {
        labels,
        properties: node.data.properties || {},
      });
    }
  });
  
  // Generate message for each node type
  nodeTypes.forEach(({ labels, properties }) => {
    const messageName = labels.map(l => capitalize(sanitizeIdentifier(l))).join('');
    
    lines.push(`// Node type: ${labels.join(', ')}`);
    lines.push(`message ${messageName} {`);
    lines.push('  string id = 1;');
    
    let fieldNum = 2;
    Object.entries(properties).forEach(([propKey, propValue]) => {
      const protoType = inferProtobufType(propValue);
      const fieldName = toSnakeCase(propKey);
      lines.push(`  ${protoType} ${fieldName} = ${fieldNum};`);
      fieldNum++;
    });
    
    lines.push('}');
    lines.push('');
  });
  
  // Generate a Graph container message
  lines.push('// Graph container');
  lines.push('message Graph {');
  
  let fieldNum = 1;
  nodeTypes.forEach(({ labels }) => {
    const messageName = labels.map(l => capitalize(sanitizeIdentifier(l))).join('');
    const fieldName = toSnakeCase(labels.join('_')) + '_nodes';
    lines.push(`  repeated ${messageName} ${fieldName} = ${fieldNum};`);
    fieldNum++;
  });
  
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Export to GraphQL schema definition (Neo4j GraphQL Library format)
 * Uses @node and @relationship directives per https://neo4j.com/docs/graphql/current/
 */
export function exportToGraphQL(
  nodes: GraphNode[],
  edges: SchemaEdge[],
  _schemaName: string = 'GraphSchema'
): string {
  const lines: string[] = [];
  
  lines.push('# Neo4j GraphQL Schema');
  lines.push('# Compatible with @neo4j/graphql library');
  lines.push('# https://neo4j.com/docs/graphql/current/');
  lines.push('');
  
  // Collect unique node types
  const nodeTypes = new Map<string, { 
    labels: string[]; 
    properties: Record<string, unknown>; 
    outgoingRels: Map<string, { targetType: string; relType: string }>; 
    incomingRels: Map<string, { sourceType: string; relType: string }>;
  }>();
  
  nodes.filter(n => !n.data.isGroup).forEach((node) => {
    const labels = node.data.labels || ['Node'];
    const key = labels.join('_');
    const existing = nodeTypes.get(key);
    
    if (existing) {
      nodeTypes.set(key, {
        ...existing,
        properties: { ...existing.properties, ...node.data.properties },
      });
    } else {
      nodeTypes.set(key, {
        labels,
        properties: node.data.properties || {},
        outgoingRels: new Map(),
        incomingRels: new Map(),
      });
    }
  });
  
  // Build relationship mappings
  const nodeIdToType = new Map<string, string>();
  nodes.filter(n => !n.data.isGroup).forEach((node) => {
    const labels = node.data.labels || ['Node'];
    nodeIdToType.set(node.id, labels.join('_'));
  });
  
  edges.forEach((edge) => {
    const sourceType = nodeIdToType.get(edge.source);
    const targetType = nodeIdToType.get(edge.target);
    const relType = edge.data?.relationshipType || 'RELATES_TO';
    
    if (sourceType && targetType) {
      const sourceNodeType = nodeTypes.get(sourceType);
      const targetNodeType = nodeTypes.get(targetType);
      
      if (sourceNodeType) {
        // Create unique key for this relationship direction
        const relKey = `${relType}_OUT_${targetType}`;
        sourceNodeType.outgoingRels.set(relKey, { targetType, relType });
      }
      
      if (targetNodeType) {
        const relKey = `${relType}_IN_${sourceType}`;
        targetNodeType.incomingRels.set(relKey, { sourceType, relType });
      }
    }
  });
  
  // Generate type for each node type with @node directive
  nodeTypes.forEach(({ labels, properties, outgoingRels, incomingRels }) => {
    const typeName = labels.map(l => capitalize(sanitizeIdentifier(l))).join('');
    
    lines.push(`type ${typeName} @node {`);
    
    // Add property fields
    Object.entries(properties).forEach(([propKey, propValue]) => {
      const gqlType = inferGraphQLType(propValue);
      const fieldName = toCamelCase(propKey);
      lines.push(`  ${fieldName}: ${gqlType}`);
    });
    
    // Add outgoing relationship fields with @relationship directive
    outgoingRels.forEach(({ targetType, relType }) => {
      const targetLabels = nodeTypes.get(targetType)?.labels || ['Node'];
      const targetTypeName = targetLabels.map(l => capitalize(sanitizeIdentifier(l))).join('');
      const fieldName = toCamelCase(relType);
      lines.push(`  ${fieldName}: [${targetTypeName}!]! @relationship(type: "${relType}", direction: OUT)`);
    });
    
    // Add incoming relationship fields with @relationship directive
    incomingRels.forEach(({ sourceType, relType }) => {
      const sourceLabels = nodeTypes.get(sourceType)?.labels || ['Node'];
      const sourceTypeName = sourceLabels.map(l => capitalize(sanitizeIdentifier(l))).join('');
      const fieldName = toCamelCase(relType) + 'By';
      lines.push(`  ${fieldName}: [${sourceTypeName}!]! @relationship(type: "${relType}", direction: IN)`);
    });
    
    lines.push('}');
    lines.push('');
  });
  
  return lines.join('\n');
}

/**
 * Main export function
 */
export function exportGraph(
  nodes: GraphNode[],
  edges: SchemaEdge[],
  graphStyle: ArrowGraphStyle = {},
  options: ExportOptions
): string {
  switch (options.format) {
    case 'arrow':
      return exportToArrow(nodes, edges, graphStyle, {
        includePositions: options.includePositions,
        includeStyles: options.includeStyles,
        includeQueries: options.includeQueries,
        queries: options.queries,
      });
    case 'cypher':
      return exportToCypher(nodes, edges);
    case 'protobuf':
      return exportToProtobuf(nodes, edges, options.schemaName);
    case 'graphql':
      return exportToGraphQL(nodes, edges, options.schemaName);
    default:
      throw new Error(`Unknown export format: ${options.format}`);
  }
}

/**
 * Get file extension for export format
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'arrow':
      return 'json';
    case 'cypher':
      return 'cypher';
    case 'protobuf':
      return 'proto';
    case 'graphql':
      return 'graphql';
    default:
      return 'txt';
  }
}

/**
 * Get MIME type for export format
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'arrow':
      return 'application/json';
    case 'cypher':
      return 'text/plain';
    case 'protobuf':
      return 'text/plain';
    case 'graphql':
      return 'text/plain';
    default:
      return 'text/plain';
  }
}

// --- Helper functions ---

function sanitizeVariableName(id: string): string {
  // Convert ID to valid Cypher variable name
  // Cypher variables must start with a letter or underscore
  let varName = id.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // If it starts with a number, prefix with underscore
  if (/^[0-9]/.test(varName)) {
    varName = '_' + varName;
  }
  
  return varName;
}

function sanitizePropertyName(name: string): string {
  // Ensure property name is valid
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

function sanitizeRelationType(type: string): string {
  // Convert to UPPER_SNAKE_CASE
  return type.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
}

function sanitizeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

function sanitizePackageName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function formatCypherValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    // Escape backslashes first, then double quotes
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatCypherValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    // Convert objects to JSON string representation
    const jsonStr = JSON.stringify(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${jsonStr}"`;
  }
  return `"${String(value)}"`;
}

function inferProtobufType(value: unknown): string {
  if (value === null || value === undefined) {
    return 'string';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int64' : 'double';
  }
  if (typeof value === 'boolean') {
    return 'bool';
  }
  if (Array.isArray(value)) {
    if (value.length > 0) {
      return 'repeated ' + inferProtobufType(value[0]);
    }
    return 'repeated string';
  }
  return 'string';
}

function inferGraphQLType(value: unknown): string {
  if (value === null || value === undefined) {
    return 'String';
  }
  if (typeof value === 'string') {
    return 'String';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'Int' : 'Float';
  }
  if (typeof value === 'boolean') {
    return 'Boolean';
  }
  if (Array.isArray(value)) {
    if (value.length > 0) {
      return `[${inferGraphQLType(value[0])}]`;
    }
    return '[String]';
  }
  return 'String';
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
}

function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_-](.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}
