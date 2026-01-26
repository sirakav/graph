'use client';

import { useState, useCallback } from 'react';
import { Upload, FileJson, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { parseArrowGraphFromJSON, parseArrowGraph } from '@/lib/arrow-parser';
import { useGraphStore } from '@/lib/graph-store';

interface ImportDialogProps {
  children?: React.ReactNode;
}

export function ImportDialog({ children }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const setGraph = useGraphStore((state) => state.setGraph);
  const setLoading = useGraphStore((state) => state.setLoading);

  const handleImport = useCallback(
    (content: string) => {
      setError(null);
      setLoading(true);

      try {
        const arrowGraph = parseArrowGraphFromJSON(content);
        
        if (!arrowGraph) {
          setError('Invalid Arrow Graph JSON format. Please check the file structure.');
          setLoading(false);
          return;
        }

        const { nodes, edges, graphStyle } = parseArrowGraph(arrowGraph);
        setGraph(nodes, edges, graphStyle);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse JSON file');
      } finally {
        setLoading(false);
      }
    },
    [setGraph, setLoading]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleImport(content);
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
        handleImport(content);
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
        handleImport(content);
      }
    },
    [handleImport]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            Import JSON
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Import Arrow Graph</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Import a graph from an Arrow Graph JSON file. Drag and drop, paste, or select a file.
          </DialogDescription>
        </DialogHeader>

        <div
          className={`
            mt-4 p-8 border-2 border-dashed rounded-lg transition-colors
            flex flex-col items-center justify-center gap-4
            ${isDragging 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onPaste={handlePaste}
          tabIndex={0}
        >
          <div className="p-4 rounded-full bg-zinc-800">
            <FileJson className="w-8 h-8 text-zinc-400" />
          </div>
          <div className="text-center">
            <p className="text-sm text-zinc-300">
              Drag and drop your JSON file here
            </p>
            <p className="text-xs text-zinc-500 mt-1">
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
          <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
