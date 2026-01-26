'use client';

import { useState, useCallback } from 'react';
import {
  FolderOpen,
  Trash2,
  Copy,
  Pencil,
  Check,
  X,
  Clock,
  MoreHorizontal,
  FileJson,
  Database,
  Share2,
  AlertTriangle,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { useSavedGraphsStore, type SavedGraph } from '@/lib/saved-graphs-store';
import { parseArrowGraph } from '@/lib/arrow-parser';
import { useGraphStore } from '@/lib/graph-store';
import { createShareableUrl, isGraphTooLargeForUrl } from '@/lib/url-share';

interface SavedGraphItemProps {
  graph: SavedGraph;
  onLoad: (graph: SavedGraph) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (graph: SavedGraph) => void;
  shareStatus: { id: string; status: 'copied' | 'error' | 'too-large' } | null;
}

function SavedGraphItem({ graph, onLoad, onRename, onDuplicate, onDelete, onShare, shareStatus }: SavedGraphItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(graph.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const isShareActive = shareStatus?.id === graph.id;

  const handleSaveEdit = () => {
    if (editName.trim()) {
      onRename(graph.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(graph.name);
    setIsEditing(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const nodeCount = graph.data.nodes?.length || 0;
  const edgeCount = graph.data.relationships?.length || 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't load if editing or if clicking on interactive elements
    if (isEditing) return;
    const target = e.target as HTMLElement;
    // Check if click is on button, input, or inside dropdown menu
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[role="menu"]')
    ) {
      return;
    }
    onLoad(graph);
  };

  return (
    <>
      <Card 
        className="group py-3 hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={handleCardClick}
      >
        <CardContent className="p-0 px-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center shrink-0 border">
              <FileJson className="w-5 h-5 text-blue-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-green-400 hover:text-green-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit();
                        }}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel</TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-left truncate text-sm font-medium">
                    {graph.name}
                  </span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare(graph);
                        }}
                      >
                        {isShareActive && shareStatus?.status === 'copied' ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            Copied!
                          </>
                        ) : isShareActive && shareStatus?.status === 'too-large' ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Too large
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            Share link
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditName(graph.name);
                          setIsEditing(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(graph.id);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {nodeCount} nodes
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {edgeCount} edges
                </Badge>
              </div>
              
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDate(graph.updatedAt)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete Graph</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{graph.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => onDelete(graph.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SavedGraphsPanelProps {
  children?: React.ReactNode;
}

export function SavedGraphsPanel({ children }: SavedGraphsPanelProps) {
  const [open, setOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ id: string; status: 'copied' | 'error' | 'too-large' } | null>(null);
  
  const savedGraphs = useSavedGraphsStore((state) => state.savedGraphs);
  const updateGraph = useSavedGraphsStore((state) => state.updateGraph);
  const deleteGraph = useSavedGraphsStore((state) => state.deleteGraph);
  const duplicateGraph = useSavedGraphsStore((state) => state.duplicateGraph);
  
  const setGraph = useGraphStore((state) => state.setGraph);

  const handleLoad = useCallback(
    (savedGraph: SavedGraph) => {
      const { nodes, edges, graphStyle } = parseArrowGraph(savedGraph.data);
      setGraph(nodes, edges, graphStyle);
      setOpen(false);
    },
    [setGraph]
  );

  const handleRename = useCallback(
    (id: string, name: string) => {
      updateGraph(id, { name });
    },
    [updateGraph]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      duplicateGraph(id);
    },
    [duplicateGraph]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteGraph(id);
    },
    [deleteGraph]
  );

  const handleShare = useCallback(
    async (savedGraph: SavedGraph) => {
      // Check if too large
      if (isGraphTooLargeForUrl(savedGraph.data)) {
        setShareStatus({ id: savedGraph.id, status: 'too-large' });
        setTimeout(() => setShareStatus(null), 2500);
        return;
      }
      
      try {
        const url = createShareableUrl(savedGraph.data);
        await navigator.clipboard.writeText(url);
        setShareStatus({ id: savedGraph.id, status: 'copied' });
        setTimeout(() => setShareStatus(null), 2000);
      } catch (error) {
        console.error('Failed to copy share URL:', error);
        setShareStatus({ id: savedGraph.id, status: 'error' });
        setTimeout(() => setShareStatus(null), 2000);
      }
    },
    []
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Saved Graphs
            {savedGraphs.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {savedGraphs.length}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[400px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Saved Graphs
          </SheetTitle>
          <SheetDescription>
            Your locally saved graph schemas. Click to load.
          </SheetDescription>
        </SheetHeader>
        
        <Separator />

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-4 space-y-3">
            {savedGraphs.length === 0 ? (
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderOpen />
                  </EmptyMedia>
                  <EmptyTitle>No saved graphs</EmptyTitle>
                  <EmptyDescription>
                    Import a graph and save it to see it here
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              savedGraphs.map((graph) => (
                <SavedGraphItem
                  key={graph.id}
                  graph={graph}
                  onLoad={handleLoad}
                  onRename={handleRename}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onShare={handleShare}
                  shareStatus={shareStatus}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
