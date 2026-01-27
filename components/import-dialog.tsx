'use client';

import { useState, useCallback } from 'react';
import { Upload, FileJson, AlertCircle, Save, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { parseArrowGraphFromJSON, parseArrowGraph, type ArrowGraph } from '@/lib/arrow-parser';
import { useGraphStore } from '@/lib/graph-store';
import { useSavedGraphsStore } from '@/lib/saved-graphs-store';
import { useSavedQueriesStore } from '@/lib/saved-queries-store';

interface ImportDialogProps {
  children?: React.ReactNode;
}

export function ImportDialog({ children }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [graphName, setGraphName] = useState('');
  const [parsedGraph, setParsedGraph] = useState<ArrowGraph | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  
  const setGraph = useGraphStore((state) => state.setGraph);
  const setLoading = useGraphStore((state) => state.setLoading);
  const saveGraph = useSavedGraphsStore((state) => state.saveGraph);
  const importQueries = useSavedQueriesStore((state) => state.importQueries);

  const resetState = useCallback(() => {
    setError(null);
    setParsedGraph(null);
    setFileName(null);
    setGraphName('');
    setSaved(false);
  }, []);

  const handleImport = useCallback(
    (content: string, name?: string) => {
      setError(null);
      setSaved(false);

      try {
        const arrowGraph = parseArrowGraphFromJSON(content);
        
        if (!arrowGraph) {
          setError('Invalid Arrow Graph JSON format. Please check the file structure.');
          return;
        }

        setParsedGraph(arrowGraph);
        setFileName(name || 'Imported Graph');
        setGraphName(name?.replace('.json', '') || 'Imported Graph');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse JSON file');
      }
    },
    []
  );

  const handleLoad = useCallback(() => {
    if (!parsedGraph) return;
    
    setLoading(true);
    try {
      const { nodes, edges, graphStyle } = parseArrowGraph(parsedGraph);
      
      if (saveToLibrary && graphName.trim()) {
        saveGraph(graphName.trim(), parsedGraph);
        setSaved(true);
      }
      
      // Import queries if they exist in the graph
      if (parsedGraph.queries && parsedGraph.queries.length > 0) {
        importQueries(parsedGraph.queries);
      }
      
      setGraph(nodes, edges, graphStyle);
      setOpen(false);
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [parsedGraph, saveToLibrary, graphName, setGraph, setLoading, saveGraph, importQueries, resetState]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleImport(content, file.name);
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsText(file);
    },
    [handleImport]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleImport(content, file.name);
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsText(file);
    },
    [handleImport]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const content = event.clipboardData.getData('text');
      if (content) {
        handleImport(content, 'Pasted Graph');
      }
    },
    [handleImport]
  );

  const nodeCount = parsedGraph?.nodes?.length || 0;
  const edgeCount = parsedGraph?.relationships?.length || 0;
  const queryCount = parsedGraph?.queries?.length || 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            Import JSON
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Arrow Graph</DialogTitle>
          <DialogDescription>
            {parsedGraph 
              ? 'Configure import settings and load your graph.'
              : 'Import a graph from an Arrow Graph JSON file. Drag and drop, paste, or select a file.'}
          </DialogDescription>
        </DialogHeader>

        {!parsedGraph ? (
          <div className="space-y-4">
            <div
              className={`
                p-8 border-2 border-dashed rounded-lg transition-colors
                flex flex-col items-center justify-center gap-4
                ${isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 bg-muted/30'
                }
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onPaste={handlePaste}
              tabIndex={0}
            >
              <div className="p-4 rounded-full bg-muted">
                <FileJson className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drag and drop your JSON file here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or paste JSON content (Ctrl+V)
                </p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="secondary" size="sm" asChild>
                  <span>Select File</span>
                </Button>
              </label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border">
                    <FileJson className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileName}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {nodeCount} nodes
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {edgeCount} relationships
                      </Badge>
                      {queryCount > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {queryCount} queries
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                  >
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Save Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="save-toggle">Save to library</Label>
                  <p className="text-xs text-muted-foreground">Store this graph for quick access later</p>
                </div>
                <Switch
                  id="save-toggle"
                  checked={saveToLibrary}
                  onCheckedChange={setSaveToLibrary}
                />
              </div>

              {saveToLibrary && (
                <div className="space-y-2">
                  <Label htmlFor="graph-name">Graph name</Label>
                  <Input
                    id="graph-name"
                    value={graphName}
                    onChange={(e) => setGraphName(e.target.value)}
                    placeholder="Enter a name for this graph"
                  />
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetState();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLoad}
                disabled={saveToLibrary && !graphName.trim()}
                className="gap-2"
              >
                {saveToLibrary ? (
                  <>
                    <Save className="w-4 h-4" />
                    Save & Load
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Load Graph
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
