'use client';

import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Upload, Database, Github } from 'lucide-react';
import { GraphCanvas } from '@/components/graph-canvas';
import { ImportDialog } from '@/components/import-dialog';
import { LayoutToolbar } from '@/components/layout-toolbar';
import { NodeInspector } from '@/components/node-inspector';
import { Button } from '@/components/ui/button';
import { useGraphStore } from '@/lib/graph-store';
import { parseArrowGraph, parseArrowGraphFromJSON } from '@/lib/arrow-parser';

export default function Home() {
  const nodes = useGraphStore((state) => state.nodes);
  const setGraph = useGraphStore((state) => state.setGraph);

  // Load demo data on mount
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    fetch(`${basePath}/demo-graph.json`)
      .then((res) => res.json())
      .then((demoGraphData) => {
        const arrowGraph = parseArrowGraphFromJSON(JSON.stringify(demoGraphData));
        if (arrowGraph) {
          const { nodes, edges, graphStyle } = parseArrowGraph(arrowGraph);
          setGraph(nodes, edges, graphStyle);
        }
      })
      .catch((err) => console.error('Failed to load demo graph:', err));
  }, [setGraph]);

  const hasGraph = nodes.length > 0;

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col bg-zinc-950 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-zinc-100 tracking-tight">
                Graph Schema Designer
              </span>
            </div>
            <span className="text-xs text-zinc-500 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
              Beta
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ImportDialog>
              <Button variant="outline" size="sm" className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Upload className="w-4 h-4" />
                Import JSON
              </Button>
            </ImportDialog>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
              asChild
            >
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 relative overflow-hidden">
          {hasGraph ? (
            <>
              {/* Graph Canvas */}
              <GraphCanvas />

              {/* Layout Toolbar - Floating */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                <LayoutToolbar />
              </div>

              {/* Stats Badge */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {nodes.length} nodes
                </span>
                <span className="text-zinc-700">•</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  {useGraphStore.getState().edges.length} relationships
                </span>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                <Database className="w-16 h-16 text-zinc-600" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-zinc-200 mb-2">
                  No Graph Loaded
                </h2>
                <p className="text-sm text-zinc-500 max-w-md">
                  Import an Arrow Graph JSON file to visualize and explore your graph database schema.
                </p>
              </div>
              <ImportDialog>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Upload className="w-4 h-4" />
                  Import Arrow Graph JSON
                </Button>
              </ImportDialog>
            </div>
          )}
        </main>

        {/* Node Inspector Sheet */}
        <NodeInspector />
      </div>
    </ReactFlowProvider>
  );
}
