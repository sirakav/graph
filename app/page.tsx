'use client';

import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Upload, Database, Github, FolderOpen } from 'lucide-react';
import { GraphCanvas } from '@/components/graph-canvas';
import { ImportDialog } from '@/components/import-dialog';
import { LayoutToolbar } from '@/components/layout-toolbar';
import { NodeInspector } from '@/components/node-inspector';
import { SavedGraphsPanel } from '@/components/saved-graphs-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { useGraphStore } from '@/lib/graph-store';
import { useSavedGraphsStore } from '@/lib/saved-graphs-store';
import { parseArrowGraph, parseArrowGraphFromJSON } from '@/lib/arrow-parser';

export default function Home() {
  const nodes = useGraphStore((state) => state.nodes);
  const setGraph = useGraphStore((state) => state.setGraph);
  const savedGraphs = useSavedGraphsStore((state) => state.savedGraphs);

  // Load demo data on mount only if no saved graphs exist
  useEffect(() => {
    // If there are saved graphs, don't auto-load demo
    if (savedGraphs.length > 0) return;
    
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
  }, [setGraph, savedGraphs.length]);

  const hasGraph = nodes.length > 0;

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b bg-card/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold tracking-tight">
                Graph Schema Designer
              </span>
            </div>
            <Badge variant="outline" className="text-[10px]">Beta</Badge>
          </div>

          <div className="flex items-center gap-2">
            <SavedGraphsPanel>
              <Button variant="outline" size="sm" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Saved Graphs</span>
                {savedGraphs.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {savedGraphs.length}
                  </Badge>
                )}
              </Button>
            </SavedGraphsPanel>
            <ImportDialog>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Import JSON
              </Button>
            </ImportDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon-sm"
                  asChild
                >
                  <a href="https://github.com/sirakav/graph" target="_blank" rel="noopener noreferrer">
                    <Github className="w-4 h-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View on GitHub</TooltipContent>
            </Tooltip>
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
              <Card className="absolute top-4 left-4 z-10 py-1.5 shadow-md">
                <CardContent className="p-0 px-3 flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {nodes.length} nodes
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    {useGraphStore.getState().edges.length} relationships
                  </span>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Empty State */
            <Empty className="h-full border-0">
              <EmptyHeader>
                <EmptyMedia>
                  <Database className="w-16 h-16 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No Graph Loaded</EmptyTitle>
                <EmptyDescription>
                  {savedGraphs.length > 0 
                    ? 'Load a saved graph or import a new Arrow Graph JSON file.'
                    : 'Import an Arrow Graph JSON file to visualize and explore your graph database schema.'}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex items-center gap-3">
                  {savedGraphs.length > 0 && (
                    <SavedGraphsPanel>
                      <Button variant="outline" className="gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Load Saved Graph
                      </Button>
                    </SavedGraphsPanel>
                  )}
                  <ImportDialog>
                    <Button className="gap-2">
                      <Upload className="w-4 h-4" />
                      Import Arrow Graph JSON
                    </Button>
                  </ImportDialog>
                </div>
              </EmptyContent>
            </Empty>
          )}
        </main>

        {/* Node Inspector Sheet */}
        <NodeInspector />
      </div>
    </ReactFlowProvider>
  );
}
