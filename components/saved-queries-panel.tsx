'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Search,
  Trash2,
  Copy,
  Pencil,
  Check,
  X,
  Clock,
  MoreHorizontal,
  Code2,
  FileCode,
  Plus,
  ChevronRight,
  Tag,
  Layers,
} from 'lucide-react';
import {
  ResizableDrawer,
  ResizableDrawerContent,
  ResizableDrawerDescription,
  ResizableDrawerHeader,
  ResizableDrawerTitle,
  ResizableDrawerTrigger,
} from '@/components/ui/resizable-drawer';
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
import { useSavedQueriesStore, type SavedQuery } from '@/lib/saved-queries-store';
import { QueryDetailView } from './query-detail-view';
import { QueryEditorDialog } from './query-editor-dialog';

interface SavedQueryItemProps {
  query: SavedQuery;
  isSelected: boolean;
  onSelect: (query: SavedQuery) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (query: SavedQuery) => void;
}

function SavedQueryItem({ 
  query, 
  isSelected, 
  onSelect, 
  onRename, 
  onDuplicate, 
  onDelete,
  onEdit,
}: SavedQueryItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(query.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSaveEdit = () => {
    if (editName.trim()) {
      onRename(query.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(query.name);
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

  const contextQueryCount = query.contextQueries ? Object.keys(query.contextQueries).length : 0;
  const tagCount = query.tags?.length || 0;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isEditing) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[role="menu"]')
    ) {
      return;
    }
    onSelect(query);
  };

  return (
    <>
      <Card 
        className={`group py-3 transition-colors cursor-pointer ${
          isSelected 
            ? 'bg-accent border-primary/50' 
            : 'hover:bg-accent/50'
        }`}
        onClick={handleCardClick}
      >
        <CardContent className="p-0 px-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center shrink-0 border">
              <Code2 className="w-5 h-5 text-emerald-400" />
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
                    {query.name}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    {isSelected && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
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
                            onEdit(query);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditName(query.name);
                            setIsEditing(true);
                          }}
                        >
                          <Tag className="w-4 h-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(query.id);
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
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {contextQueryCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    <Layers className="w-3 h-3 mr-1" />
                    {contextQueryCount} context
                  </Badge>
                )}
                {tagCount > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    <Tag className="w-3 h-3 mr-1" />
                    {tagCount}
                  </Badge>
                )}
                {query.graphMapping && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                    {query.graphMapping.targetNodeLabels?.length || 0} nodes
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDate(query.updatedAt)}
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
            <AlertDialogTitle>Delete Query</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{query.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => onDelete(query.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SavedQueriesPanelProps {
  children?: React.ReactNode;
}

export function SavedQueriesPanel({ children }: SavedQueriesPanelProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
  const [detailDrawerWidth, setDetailDrawerWidth] = useState(900);

  // Calculate 2/3 of screen width for detail drawer
  useEffect(() => {
    const updateWidth = () => {
      setDetailDrawerWidth(Math.round(window.innerWidth * (2 / 3)));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  const savedQueries = useSavedQueriesStore((state) => state.savedQueries);
  const selectedQueryId = useSavedQueriesStore((state) => state.selectedQueryId);
  const selectQuery = useSavedQueriesStore((state) => state.selectQuery);
  const updateQuery = useSavedQueriesStore((state) => state.updateQuery);
  const deleteQuery = useSavedQueriesStore((state) => state.deleteQuery);
  const duplicateQuery = useSavedQueriesStore((state) => state.duplicateQuery);

  // Filter queries based on search term
  const filteredQueries = useMemo(() => {
    if (!searchTerm.trim()) return savedQueries;
    const term = searchTerm.toLowerCase();
    return savedQueries.filter((q) => 
      q.name.toLowerCase().includes(term) ||
      q.description?.toLowerCase().includes(term) ||
      q.tags?.some((tag) => tag.toLowerCase().includes(term)) ||
      q.query.toLowerCase().includes(term)
    );
  }, [savedQueries, searchTerm]);

  const selectedQuery = useMemo(() => 
    savedQueries.find((q) => q.id === selectedQueryId) || null,
    [savedQueries, selectedQueryId]
  );

  const handleSelect = useCallback((query: SavedQuery) => {
    selectQuery(query.id === selectedQueryId ? null : query.id);
  }, [selectQuery, selectedQueryId]);

  const handleRename = useCallback((id: string, name: string) => {
    updateQuery(id, { name });
  }, [updateQuery]);

  const handleDuplicate = useCallback((id: string) => {
    duplicateQuery(id);
  }, [duplicateQuery]);

  const handleDelete = useCallback((id: string) => {
    deleteQuery(id);
  }, [deleteQuery]);

  const handleEdit = useCallback((query: SavedQuery) => {
    // Close both drawers first to avoid dialog-on-dialog issues
    selectQuery(null);
    setOpen(false);
    setEditingQuery(query);
    setEditorOpen(true);
  }, [selectQuery]);

  const handleCreateNew = useCallback(() => {
    // Close the drawer first to avoid dialog-on-dialog issues
    setOpen(false);
    setEditingQuery(null);
    setEditorOpen(true);
  }, []);

  const handleEditorClose = useCallback(() => {
    setEditorOpen(false);
    setEditingQuery(null);
  }, []);

  // Handle closing the detail drawer
  const handleDetailClose = useCallback(() => {
    selectQuery(null);
  }, [selectQuery]);

  return (
    <>
      {/* Main Queries List Drawer */}
      <ResizableDrawer open={open} onOpenChange={setOpen}>
        <ResizableDrawerTrigger asChild>
          {children || (
            <Button variant="outline" size="sm" className="gap-2">
              <FileCode className="w-4 h-4" />
              Saved Queries
              {savedQueries.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {savedQueries.length}
                </Badge>
              )}
            </Button>
          )}
        </ResizableDrawerTrigger>
        <ResizableDrawerContent 
          className="p-0"
          defaultWidth={400}
          minWidth={320}
          maxWidth={600}
        >
          <div className="flex flex-col h-full">
            <ResizableDrawerHeader className="px-4 pt-4 pb-3">
              <ResizableDrawerTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-500" />
                Saved Queries
              </ResizableDrawerTitle>
              <ResizableDrawerDescription>
                Explore and document your Cypher queries
              </ResizableDrawerDescription>
            </ResizableDrawerHeader>
            
            <div className="px-4 pb-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search queries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" onClick={handleCreateNew} className="gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">New</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Create new query</TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            <Separator />

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {filteredQueries.length === 0 ? (
                  <Empty className="border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <FileCode />
                      </EmptyMedia>
                      <EmptyTitle>
                        {searchTerm ? 'No matching queries' : 'No saved queries'}
                      </EmptyTitle>
                      <EmptyDescription>
                        {searchTerm 
                          ? 'Try a different search term'
                          : 'Create a new query to get started'}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  filteredQueries.map((query) => (
                    <SavedQueryItem
                      key={query.id}
                      query={query}
                      isSelected={query.id === selectedQueryId}
                      onSelect={handleSelect}
                      onRename={handleRename}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizableDrawerContent>
      </ResizableDrawer>

      {/* Query Detail Drawer - Opens on top of the queries list */}
      <ResizableDrawer 
        open={!!selectedQuery} 
        onOpenChange={(isOpen) => !isOpen && handleDetailClose()}
        modal={false}
      >
        <ResizableDrawerContent 
          className="p-0 flex flex-col"
          defaultWidth={detailDrawerWidth}
          minWidth={400}
          maxWidth={2000}
          showCloseButton={false}
          stacked
          ariaLabel={selectedQuery ? `Query: ${selectedQuery.name}` : 'Query Details'}
        >
          {selectedQuery && (
            <div className="flex-1 min-h-0 flex flex-col">
              <QueryDetailView 
                query={selectedQuery} 
                onEdit={() => handleEdit(selectedQuery)}
                onClose={handleDetailClose}
              />
            </div>
          )}
        </ResizableDrawerContent>
      </ResizableDrawer>

      <QueryEditorDialog
        open={editorOpen}
        onOpenChange={handleEditorClose}
        query={editingQuery}
      />
    </>
  );
}
