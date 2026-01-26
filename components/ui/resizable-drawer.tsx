'use client';

import * as React from 'react';
import { useRef, useState, useCallback } from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { XIcon, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResizableDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function ResizableDrawer({ open, onOpenChange, children }: ResizableDrawerProps) {
  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </SheetPrimitive.Root>
  );
}

function ResizableDrawerTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger {...props} />;
}

function ResizableDrawerClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close {...props} />;
}

function ResizableDrawerPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal {...props} />;
}

function ResizableDrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className
      )}
      {...props}
    />
  );
}

interface ResizableDrawerContentProps
  extends React.ComponentProps<typeof SheetPrimitive.Content> {
  side?: 'left' | 'right';
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  showCloseButton?: boolean;
  showResizeHandle?: boolean;
}

function ResizableDrawerContent({
  className,
  children,
  side = 'right',
  defaultWidth = 400,
  minWidth = 280,
  maxWidth = 800,
  showCloseButton = true,
  showResizeHandle = true,
  ...props
}: ResizableDrawerContentProps) {
  const [width, setWidth] = useState(defaultWidth);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = side === 'right'
          ? startX.current - moveEvent.clientX
          : moveEvent.clientX - startX.current;
        const newWidth = Math.min(Math.max(startWidth.current + delta, minWidth), maxWidth);
        setWidth(newWidth);
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [width, minWidth, maxWidth, side]
  );

  const resizeHandlePosition = side === 'right' ? 'left-0' : 'right-0';

  return (
    <ResizableDrawerPortal>
      <ResizableDrawerOverlay />
      <SheetPrimitive.Content
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full border-l',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full border-r',
          className
        )}
        style={{ width }}
        {...props}
      >
        {/* Resize Handle */}
        {showResizeHandle && (
          <div
            className={cn(
              'absolute top-0 bottom-0 w-2 cursor-col-resize group z-50',
              resizeHandlePosition
            )}
            onMouseDown={handleResizeStart}
          >
            <div
              className={cn(
                'absolute inset-y-0 w-1 bg-transparent group-hover:bg-blue-500/50 group-active:bg-blue-500 transition-colors',
                side === 'right' ? 'left-0' : 'right-0'
              )}
            />
            <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 p-1 rounded bg-zinc-800 border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-zinc-400" />
            </div>
          </div>
        )}

        {children}

        {showCloseButton && (
          <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </ResizableDrawerPortal>
  );
}

function ResizableDrawerHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  );
}

function ResizableDrawerFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

function ResizableDrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  );
}

function ResizableDrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  ResizableDrawer,
  ResizableDrawerTrigger,
  ResizableDrawerClose,
  ResizableDrawerContent,
  ResizableDrawerHeader,
  ResizableDrawerFooter,
  ResizableDrawerTitle,
  ResizableDrawerDescription,
};
