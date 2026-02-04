import { create } from 'zustand';

// Expected results for a query - sample data showing what the query would return
export interface ExpectedResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

// Graph mapping - which nodes and relationships a query targets
export interface QueryGraphMapping {
  targetNodeLabels: string[];
  targetRelationshipTypes: string[];
  highlightNodeIds?: string[];
  highlightEdgeIds?: string[];
}

// Context query - enrichment query that provides additional data fields
export interface ContextQuery {
  name: string;                           // Display name (e.g., "User Details")
  query: string;                          // Enrichment Cypher query
  description?: string;                   // What this context provides
  expectedResults?: ExpectedResult;       // Sample enrichment data
  graphMapping?: QueryGraphMapping;       // Additional nodes/edges touched
}

// Main saved query interface
export interface SavedQuery {
  id: string;
  name: string;
  query: string;                          // Main Cypher query
  description?: string;                   // Use case documentation
  
  // Context Queries - named enrichment slots
  contextQueries?: Record<string, ContextQuery>;
  
  expectedResults?: ExpectedResult;       // Sample output for main query
  graphMapping?: QueryGraphMapping;       // Visual mapping to nodes/edges
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

interface SavedQueriesState {
  savedQueries: SavedQuery[];
  
  // Currently selected query for viewing
  selectedQueryId: string | null;
  
  // Currently active context tab (null = main query)
  activeContextTab: string | null;
  
  // Actions
  saveQuery: (query: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateQuery: (id: string, updates: Partial<Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteQuery: (id: string) => void;
  duplicateQuery: (id: string) => string | null;
  getQuery: (id: string) => SavedQuery | undefined;
  
  // Context query actions
  addContextQuery: (queryId: string, contextKey: string, context: ContextQuery) => void;
  updateContextQuery: (queryId: string, contextKey: string, updates: Partial<ContextQuery>) => void;
  removeContextQuery: (queryId: string, contextKey: string) => void;
  
  // Selection actions
  selectQuery: (id: string | null) => void;
  setActiveContextTab: (tab: string | null) => void;
  
  // Import/Export
  importQueries: (queries: SavedQuery[]) => void;
  replaceQueries: (queries: SavedQuery[]) => void;
  clearQueries: () => void;
  exportQueries: () => SavedQuery[];
}

function generateId(): string {
  return `query_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useSavedQueriesStore = create<SavedQueriesState>()(
  (set, get) => ({
    savedQueries: [],
    selectedQueryId: null,
    activeContextTab: null,

    saveQuery: (queryData) => {
      const id = generateId();
      const now = Date.now();
      const newQuery: SavedQuery = {
        ...queryData,
        id,
        createdAt: now,
        updatedAt: now,
      };
      
      set((state) => ({
        savedQueries: [newQuery, ...state.savedQueries],
      }));
      
      return id;
    },

    updateQuery: (id, updates) => {
      set((state) => ({
        savedQueries: state.savedQueries.map((query) =>
          query.id === id
            ? {
                ...query,
                ...updates,
                updatedAt: Date.now(),
              }
            : query
        ),
      }));
    },

    deleteQuery: (id) => {
      set((state) => ({
        savedQueries: state.savedQueries.filter((query) => query.id !== id),
        selectedQueryId: state.selectedQueryId === id ? null : state.selectedQueryId,
      }));
    },

    duplicateQuery: (id) => {
      const original = get().getQuery(id);
      if (!original) return null;
      
      const newId = generateId();
      const now = Date.now();
      const duplicatedQuery: SavedQuery = {
        ...JSON.parse(JSON.stringify(original)), // Deep clone
        id: newId,
        name: `${original.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
      };
      
      set((state) => ({
        savedQueries: [duplicatedQuery, ...state.savedQueries],
      }));
      
      return newId;
    },

    getQuery: (id) => {
      return get().savedQueries.find((query) => query.id === id);
    },

    // Context query actions
    addContextQuery: (queryId, contextKey, context) => {
      set((state) => ({
        savedQueries: state.savedQueries.map((query) => {
          if (query.id !== queryId) return query;
          return {
            ...query,
            contextQueries: {
              ...query.contextQueries,
              [contextKey]: context,
            },
            updatedAt: Date.now(),
          };
        }),
      }));
    },

    updateContextQuery: (queryId, contextKey, updates) => {
      set((state) => ({
        savedQueries: state.savedQueries.map((query) => {
          if (query.id !== queryId || !query.contextQueries?.[contextKey]) return query;
          return {
            ...query,
            contextQueries: {
              ...query.contextQueries,
              [contextKey]: {
                ...query.contextQueries[contextKey],
                ...updates,
              },
            },
            updatedAt: Date.now(),
          };
        }),
      }));
    },

    removeContextQuery: (queryId, contextKey) => {
      set((state) => ({
        savedQueries: state.savedQueries.map((query) => {
          if (query.id !== queryId || !query.contextQueries) return query;
          const { [contextKey]: _, ...remainingContexts } = query.contextQueries;
          return {
            ...query,
            contextQueries: Object.keys(remainingContexts).length > 0 ? remainingContexts : undefined,
            updatedAt: Date.now(),
          };
        }),
        activeContextTab: state.activeContextTab === contextKey ? null : state.activeContextTab,
      }));
    },

    // Selection actions
    selectQuery: (id) => {
      set({ selectedQueryId: id, activeContextTab: null });
    },

    setActiveContextTab: (tab) => {
      set({ activeContextTab: tab });
    },

    // Import/Export
    importQueries: (queries) => {
      const now = Date.now();
      const importedQueries = queries.map((q) => ({
        ...q,
        id: generateId(), // Generate new IDs to avoid conflicts
        createdAt: q.createdAt || now,
        updatedAt: now,
      }));
      
      set((state) => ({
        savedQueries: [...importedQueries, ...state.savedQueries],
      }));
    },

    replaceQueries: (queries) => {
      const now = Date.now();
      const importedQueries = queries.map((q) => ({
        ...q,
        id: generateId(), // Generate new IDs to avoid conflicts
        createdAt: q.createdAt || now,
        updatedAt: now,
      }));
      
      set({
        savedQueries: importedQueries,
        selectedQueryId: null,
        activeContextTab: null,
      });
    },

    clearQueries: () => {
      set({
        savedQueries: [],
        selectedQueryId: null,
        activeContextTab: null,
      });
    },

    exportQueries: () => {
      return get().savedQueries;
    },
  })
);

// Selectors
export const useSavedQueries = () => useSavedQueriesStore((state) => state.savedQueries);
export const useSelectedQueryId = () => useSavedQueriesStore((state) => state.selectedQueryId);
export const useActiveContextTab = () => useSavedQueriesStore((state) => state.activeContextTab);

export const useSelectedQuery = () => {
  const queries = useSavedQueries();
  const selectedId = useSelectedQueryId();
  return selectedId ? queries.find((q) => q.id === selectedId) : null;
};

// Get the currently active query content (main or context)
export const useActiveQueryContent = () => {
  const selectedQuery = useSelectedQuery();
  const activeTab = useActiveContextTab();
  
  if (!selectedQuery) return null;
  
  if (activeTab && selectedQuery.contextQueries?.[activeTab]) {
    return {
      type: 'context' as const,
      key: activeTab,
      ...selectedQuery.contextQueries[activeTab],
    };
  }
  
  return {
    type: 'main' as const,
    key: null,
    name: selectedQuery.name,
    query: selectedQuery.query,
    description: selectedQuery.description,
    expectedResults: selectedQuery.expectedResults,
    graphMapping: selectedQuery.graphMapping,
  };
};
