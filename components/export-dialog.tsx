'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  FileJson,
  Database,
  Code2,
  Braces,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGraphStore } from '@/lib/graph-store';
import { useSavedQueriesStore } from '@/lib/saved-queries-store';
import {
  exportGraph,
  getFileExtension,
  getMimeType,
  type ExportFormat,
  type ExportOptions,
} from '@/lib/graph-exporter';

interface ExportDialogProps {
  children?: React.ReactNode;
}

interface FormatInfo {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
  language: string;
}

const FORMATS: FormatInfo[] = [
  {
    id: 'arrow',
    name: 'Arrow JSON',
    description: 'Native graph format with positions & styles',
    icon: <FileJson className="w-4 h-4" />,
    extension: '.json',
    language: 'json',
  },
  {
    id: 'cypher',
    name: 'Cypher',
    description: 'Neo4j query language for graph databases',
    icon: <Database className="w-4 h-4" />,
    extension: '.cypher',
    language: 'cypher',
  },
  {
    id: 'protobuf',
    name: 'Protocol Buffers',
    description: 'Message definitions for node types',
    icon: <Code2 className="w-4 h-4" />,
    extension: '.proto',
    language: 'protobuf',
  },
  {
    id: 'graphql',
    name: 'GraphQL',
    description: 'Neo4j GraphQL Library schema with @node and @relationship',
    icon: <Braces className="w-4 h-4" />,
    extension: '.graphql',
    language: 'graphql',
  },
];

export function ExportDialog({ children }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('arrow');
  const [copied, setCopied] = useState(false);
  const [schemaName, setSchemaName] = useState('GraphSchema');
  const [includePositions, setIncludePositions] = useState(true);
  const [includeStyles, setIncludeStyles] = useState(true);
  const [includeQueries, setIncludeQueries] = useState(true);

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const graphStyle = useGraphStore((state) => state.graphStyle);
  const savedQueries = useSavedQueriesStore((state) => state.savedQueries);

  const exportedContent = useMemo(() => {
    if (nodes.length === 0) return '';

    const options: ExportOptions = {
      format: selectedFormat,
      schemaName,
      includePositions,
      includeStyles,
      includeQueries,
      queries: savedQueries,
    };

    try {
      return exportGraph(nodes, edges, graphStyle, options);
    } catch (error) {
      console.error('Export error:', error);
      return `// Error generating export: ${error}`;
    }
  }, [nodes, edges, graphStyle, selectedFormat, schemaName, includePositions, includeStyles, includeQueries, savedQueries]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [exportedContent]);

  const handleDownload = useCallback(() => {
    const extension = getFileExtension(selectedFormat);
    const mimeType = getMimeType(selectedFormat);
    const filename = `graph-export.${extension}`;

    const blob = new Blob([exportedContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportedContent, selectedFormat]);

  const currentFormat = FORMATS.find((f) => f.id === selectedFormat);
  const nodeCount = nodes.filter((n) => !n.data.isGroup).length;
  const edgeCount = edges.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Graph</DialogTitle>
          <DialogDescription>
            Export your graph schema in different formats for use with various tools and databases.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Format Tabs */}
          <Tabs
            value={selectedFormat}
            onValueChange={(v) => setSelectedFormat(v as ExportFormat)}
            className="flex-1 min-h-0 flex flex-col"
          >
            <TabsList className="w-full h-10 p-1 grid grid-cols-4">
              {FORMATS.map((format) => (
                <TabsTrigger
                  key={format.id}
                  value={format.id}
                  className="gap-1.5 text-xs data-[state=active]:bg-background"
                >
                  {format.icon}
                  <span className="hidden sm:inline">{format.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Format-specific content */}
            {FORMATS.map((format) => (
              <TabsContent
                key={format.id}
                value={format.id}
                className="flex-1 min-h-0 flex flex-col gap-4 mt-4"
              >
                {/* Format description and stats */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{format.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {nodeCount} nodes
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {edgeCount} edges
                    </Badge>
                  </div>
                </div>

                {/* Format-specific options */}
                {format.id === 'arrow' && (
                  <div className="flex flex-wrap items-center gap-6 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="positions"
                        checked={includePositions}
                        onCheckedChange={setIncludePositions}
                      />
                      <Label htmlFor="positions" className="text-sm cursor-pointer">
                        Include positions
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="styles"
                        checked={includeStyles}
                        onCheckedChange={setIncludeStyles}
                      />
                      <Label htmlFor="styles" className="text-sm cursor-pointer">
                        Include styles
                      </Label>
                    </div>
                    {savedQueries.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Switch
                          id="queries"
                          checked={includeQueries}
                          onCheckedChange={setIncludeQueries}
                        />
                        <Label htmlFor="queries" className="text-sm cursor-pointer">
                          Include queries ({savedQueries.length})
                        </Label>
                      </div>
                    )}
                  </div>
                )}

                {(format.id === 'protobuf' || format.id === 'graphql') && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Label htmlFor="schema-name" className="text-sm shrink-0">
                      Schema name:
                    </Label>
                    <Input
                      id="schema-name"
                      value={schemaName}
                      onChange={(e) => setSchemaName(e.target.value)}
                      placeholder="GraphSchema"
                      className="max-w-xs h-8"
                    />
                  </div>
                )}

                {/* Code preview */}
                <div className="flex-1 min-h-0 relative">
                  <ScrollArea className="h-[280px] rounded-lg border bg-zinc-950 text-zinc-100">
                    <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
                      <code>{exportedContent}</code>
                    </pre>
                  </ScrollArea>

                  {/* Action buttons - floating */}
                  <div className="absolute top-2 right-4 flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={handleCopy}
                          className="h-7 w-7 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{copied ? 'Copied!' : 'Copy to clipboard'}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Download button */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              File: <span className="font-mono">graph-export{currentFormat?.extension}</span>
            </p>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Download {currentFormat?.name}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
