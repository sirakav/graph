'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NodeEditorDialog } from './node-editor-dialog';

export function EditToolbar() {
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={() => setNodeDialogOpen(true)}
            className="h-10 w-10 rounded-full shadow-lg"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Add node</TooltipContent>
      </Tooltip>

      <NodeEditorDialog
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        nodeId={null}
      />
    </>
  );
}
