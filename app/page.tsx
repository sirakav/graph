'use client';

import { useEffect, useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Upload, Download, Database, Github, FolderOpen, Share2, Check, AlertTriangle, Plus, Layers, FilePlus2, Save, FileCode } from 'lucide-react';
import { GraphCanvas } from '@/components/graph-canvas';
import { ImportDialog } from '@/components/import-dialog';
import { ExportDialog } from '@/components/export-dialog';
import { LayoutToolbar } from '@/components/layout-toolbar';
import { NodeInspector } from '@/components/node-inspector';
import { SavedGraphsPanel } from '@/components/saved-graphs-panel';
import { SavedQueriesPanel } from '@/components/saved-queries-panel';
import { EditToolbar } from '@/components/edit-toolbar';
import { NodeEditorDialog } from '@/components/node-editor-dialog';
import { SchemaExplorer } from '@/components/schema-explorer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogMedia,
} from '@/components/ui/alert-dialog';
import { useGraphStore, useHasActiveHighlights } from '@/lib/graph-store';
import { useSavedGraphsStore } from '@/lib/saved-graphs-store';
import { useSavedQueriesStore } from '@/lib/saved-queries-store';
import { parseArrowGraph, parseArrowGraphFromJSON, type ArrowGraph } from '@/lib/arrow-parser';
import {
  loadSharedGraphFromUrl,
  hasSharedGraphInUrl,
  clearGraphFromUrl,
  createShareableUrl,
  isGraphTooLargeForUrl,
} from '@/lib/url-share';

export default function Home() {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const graphStyle = useGraphStore((state) => state.graphStyle);
  const currentSavedGraphId = useGraphStore((state) => state.currentSavedGraphId);
  const currentSavedGraphName = useGraphStore((state) => state.currentSavedGraphName);
  const hasUnsavedChanges = useGraphStore((state) => state.hasUnsavedChanges);
  const setGraph = useGraphStore((state) => state.setGraph);
  const clearGraph = useGraphStore((state) => state.clearGraph);
  const markAsSaved = useGraphStore((state) => state.markAsSaved);
  const setCurrentSavedGraph = useGraphStore((state) => state.setCurrentSavedGraph);
  const savedGraphs = useSavedGraphsStore((state) => state.savedGraphs);
  const saveGraph = useSavedGraphsStore((state) => state.saveGraph);
  const updateSavedGraph = useSavedGraphsStore((state) => state.updateGraph);
  const savedQueries = useSavedQueriesStore((state) => state.savedQueries);
  const clearQueries = useSavedQueriesStore((state) => state.clearQueries);
  const replaceQueries = useSavedQueriesStore((state) => state.replaceQueries);
  const hasActiveHighlights = useHasActiveHighlights();
  const clearHighlights = useGraphStore((state) => state.clearHighlights);
  
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [urlTooLong, setUrlTooLong] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [newGraphDialogOpen, setNewGraphDialogOpen] = useState(false);
  const [clearGraphDialogOpen, setClearGraphDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveGraphName, setSaveGraphName] = useState('');

  // Reconstruct ArrowGraph from current state for sharing
  const getCurrentArrowGraph = useCallback((): ArrowGraph | null => {
    if (nodes.length === 0) return null;
    
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
      // Include saved queries so they're associated with this graph
      queries: savedQueries.length > 0 ? savedQueries : undefined,
    };
  }, [nodes, edges, graphStyle, savedQueries]);

  // Handle sharing the current graph
  const handleShare = useCallback(async () => {
    const arrowGraph = getCurrentArrowGraph();
    if (!arrowGraph) return;
    
    // Check if URL would be too long
    if (isGraphTooLargeForUrl(arrowGraph)) {
      setUrlTooLong(true);
      setShareStatus('error');
      setTimeout(() => {
        setShareStatus('idle');
        setUrlTooLong(false);
      }, 3000);
      return;
    }
    
    try {
      const url = createShareableUrl(arrowGraph);
      await navigator.clipboard.writeText(url);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy share URL:', error);
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 2000);
    }
  }, [getCurrentArrowGraph]);

  // Handle saving the current graph
  const handleSave = useCallback(() => {
    const arrowGraph = getCurrentArrowGraph();
    if (!arrowGraph) return;

    // If we have a current saved graph, update it directly
    if (currentSavedGraphId) {
      updateSavedGraph(currentSavedGraphId, { data: arrowGraph });
      markAsSaved();
      return;
    }

    // Otherwise, open dialog to save as new
    setSaveGraphName('');
    setSaveDialogOpen(true);
  }, [getCurrentArrowGraph, currentSavedGraphId, updateSavedGraph, markAsSaved]);

  // Handle saving as a new graph with a name
  const handleSaveAs = useCallback(() => {
    const arrowGraph = getCurrentArrowGraph();
    if (!arrowGraph || !saveGraphName.trim()) return;

    const newId = saveGraph(saveGraphName.trim(), arrowGraph);
    setCurrentSavedGraph(newId, saveGraphName.trim());
    setSaveDialogOpen(false);
    setSaveGraphName('');
  }, [getCurrentArrowGraph, saveGraphName, saveGraph, setCurrentSavedGraph]);

  // Single initialization effect to handle URL loading and demo fallback
  // This avoids race conditions between separate effects
  useEffect(() => {
    if (isInitialized) return;
    
    // Priority 1: Load from shared URL
    if (hasSharedGraphInUrl()) {
      const sharedGraph = loadSharedGraphFromUrl();
      if (sharedGraph) {
        const { nodes: parsedNodes, edges: parsedEdges, graphStyle: parsedStyle } = parseArrowGraph(sharedGraph);
        setGraph(parsedNodes, parsedEdges, parsedStyle);
        
        // Load queries from the shared graph (or clear if none)
        if (sharedGraph.queries && sharedGraph.queries.length > 0) {
          replaceQueries(sharedGraph.queries);
        } else {
          clearQueries();
        }
        
        // Auto-save the imported graph
        saveGraph('Imported from shared link', sharedGraph);
        
        // Clear the URL parameter to allow normal navigation
        clearGraphFromUrl();
        
        setIsInitialized(true);
        return;
      }
    }
    
    // Priority 2: Skip demo if user has saved graphs
    if (savedGraphs.length > 0) {
      // Clear any stale queries when no graph is auto-loaded
      clearQueries();
      setIsInitialized(true);
      return;
    }
    
    // Priority 3: Load demo graph for new users
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    fetch(`${basePath}/demo-graph.json`)
      .then((res) => res.json())
      .then((demoGraphData) => {
        const arrowGraph = parseArrowGraphFromJSON(JSON.stringify(demoGraphData));
        if (arrowGraph) {
          const { nodes, edges, graphStyle } = parseArrowGraph(arrowGraph);
          setGraph(nodes, edges, graphStyle);
          // Load queries from demo graph (or clear if none)
          if (arrowGraph.queries && arrowGraph.queries.length > 0) {
            replaceQueries(arrowGraph.queries);
          } else {
            clearQueries();
          }
        }
      })
      .catch((err) => console.error('Failed to load demo graph:', err))
      .finally(() => setIsInitialized(true));
  }, [setGraph, saveGraph, savedGraphs.length, isInitialized, replaceQueries, clearQueries]);

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
            {currentSavedGraphName && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground border-l pl-3">
                <span className="truncate max-w-[200px]">{currentSavedGraphName}</span>
                {hasUnsavedChanges && (
                  <span className="text-amber-500 text-xs">•&nbsp;Unsaved</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Save Button - only shows when a graph exists */}
            {hasGraph && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={hasUnsavedChanges ? "default" : "outline"} 
                    size="sm" 
                    className="gap-2"
                    onClick={handleSave}
                  >
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {currentSavedGraphId ? 'Save' : 'Save As'}
                    </span>
                    {hasUnsavedChanges && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {currentSavedGraphId 
                    ? `Save changes to "${currentSavedGraphName}"` 
                    : 'Save graph to library'}
                </TooltipContent>
              </Tooltip>
            )}
            {/* New Graph Button - only shows when a graph exists */}
            {hasGraph && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setClearGraphDialogOpen(true)}
                  >
                    <FilePlus2 className="w-4 h-4" />
                    <span className="hidden sm:inline">New Graph</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create a new empty graph</TooltipContent>
              </Tooltip>
            )}
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
            {hasGraph && (
              <SavedQueriesPanel>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileCode className="w-4 h-4" />
                  <span className="hidden sm:inline">Queries</span>
                  {savedQueries.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {savedQueries.length}
                    </Badge>
                  )}
                </Button>
              </SavedQueriesPanel>
            )}
            <SchemaExplorer>
              <Button variant="outline" size="sm" className="gap-2" disabled={nodes.length === 0}>
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Schema</span>
              </Button>
            </SchemaExplorer>
            <ImportDialog>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Import JSON
              </Button>
            </ImportDialog>
            <ExportDialog>
              <Button variant="outline" size="sm" className="gap-2" disabled={nodes.length === 0}>
                <Download className="w-4 h-4" />
                Export
              </Button>
            </ExportDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2"
                  onClick={handleShare}
                  disabled={nodes.length === 0 || shareStatus === 'copied'}
                >
                  {shareStatus === 'copied' ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : shareStatus === 'error' && urlTooLong ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="hidden sm:inline">Too large</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Share</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {nodes.length === 0 
                  ? 'Load a graph to share' 
                  : urlTooLong 
                    ? 'Graph too large for URL sharing'
                    : 'Copy shareable link'}
              </TooltipContent>
            </Tooltip>
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

              {/* Add Node Button - Top Right */}
              <div className="absolute top-4 right-4 z-10">
                <EditToolbar />
              </div>

              {/* Stats Badge - Top Left */}
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
                  {hasActiveHighlights && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <button
                        onClick={clearHighlights}
                        className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Query Highlight
                        <span className="text-[10px]">✕</span>
                      </button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Layout Toolbar - Bottom Center */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                <LayoutToolbar />
              </div>
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
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button onClick={() => setNewGraphDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create New Graph
                  </Button>
                  {savedGraphs.length > 0 && (
                    <SavedGraphsPanel>
                      <Button variant="outline" className="gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Load Saved Graph
                      </Button>
                    </SavedGraphsPanel>
                  )}
                  <ImportDialog>
                    <Button variant="outline" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Import JSON
                    </Button>
                  </ImportDialog>
                </div>
              </EmptyContent>
            </Empty>
          )}
        </main>

        {/* Node Inspector Sheet */}
        <NodeInspector />

        {/* New Graph Dialog - Creates first node */}
        <NodeEditorDialog
          open={newGraphDialogOpen}
          onOpenChange={setNewGraphDialogOpen}
        />

        {/* Clear Graph Confirmation Dialog */}
        <AlertDialog open={clearGraphDialogOpen} onOpenChange={setClearGraphDialogOpen}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-primary/10">
                <FilePlus2 className="text-primary" />
              </AlertDialogMedia>
              <AlertDialogTitle>Create New Graph?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear the current graph. Make sure to save or export your work first if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  clearGraph();
                  clearQueries();
                  setClearGraphDialogOpen(false);
                }}
              >
                Create New
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save As Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="w-5 h-5 text-primary" />
                Save Graph
              </DialogTitle>
              <DialogDescription>
                Give your graph a name to save it to your library.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="graph-name">Graph Name</Label>
                <Input
                  id="graph-name"
                  placeholder="My Graph Schema"
                  value={saveGraphName}
                  onChange={(e) => setSaveGraphName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && saveGraphName.trim()) {
                      handleSaveAs();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAs} disabled={!saveGraphName.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ReactFlowProvider>
  );
}
