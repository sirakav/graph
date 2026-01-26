import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ArrowGraph } from './arrow-parser';

export interface SavedGraph {
  id: string;
  name: string;
  data: ArrowGraph;
  createdAt: number;
  updatedAt: number;
}

interface SavedGraphsState {
  savedGraphs: SavedGraph[];
  
  // Actions
  saveGraph: (name: string, data: ArrowGraph) => string;
  updateGraph: (id: string, data: Partial<Pick<SavedGraph, 'name' | 'data'>>) => void;
  deleteGraph: (id: string) => void;
  getGraph: (id: string) => SavedGraph | undefined;
  duplicateGraph: (id: string) => string | null;
}

function generateId(): string {
  return `graph_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useSavedGraphsStore = create<SavedGraphsState>()(
  persist(
    (set, get) => ({
      savedGraphs: [],

      saveGraph: (name, data) => {
        const id = generateId();
        const now = Date.now();
        const newGraph: SavedGraph = {
          id,
          name,
          data,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          savedGraphs: [newGraph, ...state.savedGraphs],
        }));
        
        return id;
      },

      updateGraph: (id, updates) => {
        set((state) => ({
          savedGraphs: state.savedGraphs.map((graph) =>
            graph.id === id
              ? {
                  ...graph,
                  ...updates,
                  updatedAt: Date.now(),
                }
              : graph
          ),
        }));
      },

      deleteGraph: (id) => {
        set((state) => ({
          savedGraphs: state.savedGraphs.filter((graph) => graph.id !== id),
        }));
      },

      getGraph: (id) => {
        return get().savedGraphs.find((graph) => graph.id === id);
      },

      duplicateGraph: (id) => {
        const original = get().getGraph(id);
        if (!original) return null;
        
        const newId = generateId();
        const now = Date.now();
        const duplicatedGraph: SavedGraph = {
          id: newId,
          name: `${original.name} (Copy)`,
          data: JSON.parse(JSON.stringify(original.data)), // Deep clone
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          savedGraphs: [duplicatedGraph, ...state.savedGraphs],
        }));
        
        return newId;
      },
    }),
    {
      name: 'graph-schema-designer-saved-graphs',
      version: 1,
    }
  )
);

// Selectors
export const useSavedGraphs = () => useSavedGraphsStore((state) => state.savedGraphs);
