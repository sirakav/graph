# Arrow Graph JSON Schema

This document describes the JSON schema for Arrow Graph files used by the Graph Visualizer application.

## Overview

Arrow Graph files are JSON documents that define nodes (entities), relationships (edges), and visual styling. The format is designed for flexibility and backward compatibility.

## File Structure

```json
{
  "nodes": [...],
  "relationships": [...],
  "style": {...},
  "queries": [...]  // Optional - saved queries for use case exploration
}
```

## Nodes

Nodes represent entities in the graph. Each node has the following structure:

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier for the node |
| `position` | `object` | Position coordinates `{ x: number, y: number }` |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `labels` | `string[]` | `[]` | Category labels displayed on the node |
| `properties` | `object` | `{}` | Key-value pairs of node properties |
| `style` | `object` | `{}` | Visual styling (see [Node Style](#node-style)) |
| `group` | `string` | - | ID of the parent group (for grouping) |
| `isGroup` | `boolean` | `false` | Marks this node as a group container |

### Node Style

| Field | Type | Description |
|-------|------|-------------|
| `border-color` | `string` | CSS color for the node border |
| `node-color` | `string` | CSS color for the node background |

### Basic Node Example

```json
{
  "id": "server-001",
  "position": { "x": 100, "y": 200 },
  "labels": ["Server", "Production"],
  "properties": {
    "name": "Web Server",
    "ip": "10.0.1.10",
    "os": "Ubuntu 22.04"
  },
  "style": {
    "border-color": "#00BFFF",
    "node-color": "#002633"
  }
}
```

## Relationships

Relationships define connections between nodes.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier for the relationship |
| `fromId` | `string` | ID of the source node |
| `toId` | `string` | ID of the target node |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `string` | `""` | Relationship type label (e.g., "CONNECTS_TO") |
| `properties` | `object` | `{}` | Key-value pairs of relationship properties |
| `style` | `object` | `{}` | Visual styling options |

### Relationship Example

```json
{
  "id": "rel-001",
  "fromId": "server-001",
  "toId": "database-001",
  "type": "CONNECTS_TO",
  "properties": {
    "port": 5432,
    "encrypted": true
  },
  "style": {}
}
```

## Graph Style

Global styling options applied to the entire graph.

| Field | Type | Description |
|-------|------|-------------|
| `font-family` | `string` | Font family for text |
| `background-color` | `string` | Canvas background color |
| `node-color` | `string` | Default node background color |
| `border-color` | `string` | Default node border color |
| `border-width` | `number` | Default border width in pixels |
| `radius` | `number` | Node corner radius |
| `arrow-color` | `string` | Relationship arrow color |
| `arrow-width` | `number` | Relationship arrow width |

---

## Node Grouping

Nodes can be organized into hierarchical groups. Groups are rendered as container boxes that visually contain their child nodes.

### Creating a Group

To create a group:

1. Create a node with `isGroup: true`
2. Set child nodes' `group` field to the group's ID

### Group Behavior

- **Visual Container**: Groups render as dashed-border containers with a header label
- **Drag Together**: When a group is dragged, all child nodes move with it
- **Nested Groups**: Groups can contain other groups (unlimited nesting depth)
- **Position**: Child node positions are relative to their parent group

### Simple Grouping Example

```json
{
  "nodes": [
    {
      "id": "infrastructure",
      "position": { "x": 100, "y": 100 },
      "labels": ["Infrastructure"],
      "properties": { "environment": "production" },
      "style": { "border-color": "#10B981" },
      "isGroup": true
    },
    {
      "id": "web-server",
      "position": { "x": 50, "y": 80 },
      "labels": ["Server"],
      "properties": { "name": "Web Server" },
      "style": { "border-color": "#3B82F6" },
      "group": "infrastructure"
    },
    {
      "id": "db-server",
      "position": { "x": 250, "y": 80 },
      "labels": ["Database"],
      "properties": { "name": "PostgreSQL" },
      "style": { "border-color": "#8B5CF6" },
      "group": "infrastructure"
    }
  ],
  "relationships": [
    {
      "id": "r1",
      "fromId": "web-server",
      "toId": "db-server",
      "type": "CONNECTS_TO",
      "properties": {},
      "style": {}
    }
  ],
  "style": {}
}
```

### Nested Groups Example

Groups can be nested to any depth by setting a group's `group` field to another group's ID:

```json
{
  "nodes": [
    {
      "id": "company",
      "position": { "x": 50, "y": 50 },
      "labels": ["Organization"],
      "properties": { "name": "Acme Corp" },
      "style": { "border-color": "#8B5CF6" },
      "isGroup": true
    },
    {
      "id": "engineering",
      "position": { "x": 30, "y": 60 },
      "labels": ["Department"],
      "properties": { "name": "Engineering" },
      "style": { "border-color": "#3B82F6" },
      "isGroup": true,
      "group": "company"
    },
    {
      "id": "frontend-team",
      "position": { "x": 20, "y": 50 },
      "labels": ["Team"],
      "properties": { "name": "Frontend" },
      "style": { "border-color": "#10B981" },
      "isGroup": true,
      "group": "engineering"
    },
    {
      "id": "alice",
      "position": { "x": 20, "y": 50 },
      "labels": ["Person"],
      "properties": { "name": "Alice", "role": "Developer" },
      "style": { "border-color": "#F59E0B" },
      "group": "frontend-team"
    },
    {
      "id": "bob",
      "position": { "x": 150, "y": 50 },
      "labels": ["Person"],
      "properties": { "name": "Bob", "role": "Designer" },
      "style": { "border-color": "#F59E0B" },
      "group": "frontend-team"
    }
  ],
  "relationships": [],
  "style": {}
}
```

This creates a hierarchy:
```
company (Organization)
└── engineering (Department)
    └── frontend-team (Team)
        ├── alice (Person)
        └── bob (Person)
```

---

## Saved Queries

The optional `queries` array allows you to store Cypher queries alongside your graph schema for documentation and use case exploration. Each query can include context queries (enrichment slots) that provide additional data fields.

### Query Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the query |
| `name` | `string` | Yes | Display name for the query |
| `query` | `string` | Yes | Main Cypher query text |
| `description` | `string` | No | Documentation describing the query's purpose |
| `tags` | `string[]` | No | Tags for categorization and filtering |
| `expectedResults` | `object` | No | Sample output data (see [Expected Results](#expected-results)) |
| `graphMapping` | `object` | No | Visual mapping to nodes/edges (see [Graph Mapping](#graph-mapping)) |
| `contextQueries` | `object` | No | Named enrichment queries (see [Context Queries](#context-queries)) |
| `createdAt` | `number` | Yes | Unix timestamp of creation |
| `updatedAt` | `number` | Yes | Unix timestamp of last update |

### Expected Results

Sample output data showing what the query would return.

| Field | Type | Description |
|-------|------|-------------|
| `columns` | `string[]` | Column headers for the result set |
| `rows` | `object[]` | Array of row objects with column values |

```json
{
  "expectedResults": {
    "columns": ["user", "role", "permissions"],
    "rows": [
      { "user": "alice@corp.com", "role": "Admin", "permissions": ["read", "write", "delete"] },
      { "user": "bob@corp.com", "role": "Admin", "permissions": ["read", "write"] }
    ]
  }
}
```

### Graph Mapping

Defines which nodes and relationships the query targets for visual highlighting.

| Field | Type | Description |
|-------|------|-------------|
| `targetNodeLabels` | `string[]` | Node labels this query touches |
| `targetRelationshipTypes` | `string[]` | Relationship types involved |
| `highlightNodeIds` | `string[]` | Specific node IDs to highlight |
| `highlightEdgeIds` | `string[]` | Specific edge IDs to highlight |

```json
{
  "graphMapping": {
    "targetNodeLabels": ["Person", "Role"],
    "targetRelationshipTypes": ["HAS_ROLE", "HAS_PERMISSION"]
  }
}
```

### Context Queries

Named enrichment slots that provide additional data fields related to the main query. Context queries are stored as a key-value object where the key is a unique identifier.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Display name for the context |
| `query` | `string` | Yes | Enrichment Cypher query |
| `description` | `string` | No | What this context provides |
| `expectedResults` | `object` | No | Sample enrichment data |
| `graphMapping` | `object` | No | Additional nodes/edges touched |

### Complete Query Example

```json
{
  "queries": [
    {
      "id": "query_admin_access",
      "name": "Find Admin Users",
      "query": "MATCH (p:Person)-[:HAS_ROLE]->(r:Role)\nWHERE r.name = 'Admin'\nRETURN p.email, p.name, r.permissions",
      "description": "Identifies all users with administrative privileges in the system. Use this to audit admin access and ensure principle of least privilege.",
      "tags": ["security", "audit", "access-control"],
      "expectedResults": {
        "columns": ["p.email", "p.name", "r.permissions"],
        "rows": [
          { "p.email": "alice@corp.com", "p.name": "Alice Smith", "r.permissions": ["read", "write", "delete"] }
        ]
      },
      "graphMapping": {
        "targetNodeLabels": ["Person", "Role"],
        "targetRelationshipTypes": ["HAS_ROLE"]
      },
      "contextQueries": {
        "user_details": {
          "name": "User Details",
          "query": "MATCH (p:Person)\nRETURN p.email, p.department, p.last_login, p.created_at",
          "description": "Additional user profile information including department and activity",
          "expectedResults": {
            "columns": ["email", "department", "last_login"],
            "rows": [
              { "email": "alice@corp.com", "department": "Engineering", "last_login": "2024-01-15T10:30:00Z" }
            ]
          }
        },
        "asset_access": {
          "name": "Asset Access",
          "query": "MATCH (p:Person)-[:HAS_ACCESS]->(a:Asset)\nRETURN a.name, a.type, a.sensitivity",
          "description": "Assets accessible by admin users",
          "graphMapping": {
            "targetNodeLabels": ["Asset"],
            "targetRelationshipTypes": ["HAS_ACCESS"]
          }
        },
        "credential_exposure": {
          "name": "Credential Exposure",
          "query": "MATCH (p:Person)-[:OWNS]->(c:StolenCredential)\nRETURN c.source, c.detected_at, c.severity",
          "description": "Known credential exposures for admin users - critical for security response"
        }
      },
      "createdAt": 1706367600000,
      "updatedAt": 1706367600000
    }
  ]
}
```

### Use Cases for Saved Queries

- **Security Auditing**: Document queries for access reviews, privilege escalation detection
- **Compliance**: Store queries that verify compliance requirements
- **Incident Response**: Pre-built queries for investigating security incidents
- **Onboarding**: Help new team members understand the graph schema through example queries
- **Documentation**: Self-documenting graph schemas with real query examples

---

## Backward Compatibility

All optional fields (`group`, `isGroup`, `queries`) are designed for backward compatibility. Files created before these features were added will continue to work without modification:

- Nodes without `group` or `isGroup` fields render as standalone nodes
- Files without a `queries` array simply have no saved queries
- The parser automatically handles missing optional fields
- No migration is required for existing files

---

## Complete Example

```json
{
  "nodes": [
    {
      "id": "network",
      "position": { "x": 100, "y": 100 },
      "labels": ["Network"],
      "properties": { "name": "Production Network", "vlan": 100 },
      "style": { "border-color": "#10B981", "node-color": "#052E16" },
      "isGroup": true
    },
    {
      "id": "web-server",
      "position": { "x": 50, "y": 80 },
      "labels": ["Server"],
      "properties": {
        "name": "Web Server",
        "ip": "10.0.1.10",
        "os": "Ubuntu 22.04"
      },
      "style": { "border-color": "#3B82F6", "node-color": "#0C1929" },
      "group": "network"
    },
    {
      "id": "database",
      "position": { "x": 250, "y": 80 },
      "labels": ["Database"],
      "properties": {
        "name": "PostgreSQL",
        "ip": "10.0.1.20",
        "version": "15.2"
      },
      "style": { "border-color": "#8B5CF6", "node-color": "#1E1033" },
      "group": "network"
    },
    {
      "id": "external-api",
      "position": { "x": 500, "y": 200 },
      "labels": ["External Service"],
      "properties": {
        "name": "Payment Gateway",
        "url": "https://api.payments.com"
      },
      "style": { "border-color": "#F59E0B", "node-color": "#332107" }
    }
  ],
  "relationships": [
    {
      "id": "r1",
      "fromId": "web-server",
      "toId": "database",
      "type": "QUERIES",
      "properties": { "port": 5432 },
      "style": {}
    },
    {
      "id": "r2",
      "fromId": "web-server",
      "toId": "external-api",
      "type": "CALLS",
      "properties": { "protocol": "HTTPS" },
      "style": {}
    }
  ],
  "style": {
    "font-family": "Inter",
    "background-color": "#0A0A0A",
    "node-color": "#1F1F1F",
    "border-color": "#404040",
    "arrow-color": "#6B7280",
    "arrow-width": 2
  },
  "queries": [
    {
      "id": "query_server_connections",
      "name": "Server Database Connections",
      "query": "MATCH (s:Server)-[r:QUERIES]->(d:Database)\nRETURN s.name, d.name, r.port",
      "description": "Find all servers connected to databases within the production network",
      "tags": ["infrastructure", "networking"],
      "graphMapping": {
        "targetNodeLabels": ["Server", "Database"],
        "targetRelationshipTypes": ["QUERIES"]
      },
      "createdAt": 1706367600000,
      "updatedAt": 1706367600000
    }
  ]
}
```
