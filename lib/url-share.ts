import * as LZString from 'lz-string';
import type { ArrowGraph } from './arrow-parser';

const URL_PARAM_KEY = 'g';

/**
 * Encodes a graph into a URL-safe compressed string
 * Uses LZ-String compression with URI-safe encoding
 */
export function encodeGraphToUrl(graph: ArrowGraph): string {
  try {
    // Minify the graph by removing unnecessary whitespace
    const jsonString = JSON.stringify(graph);
    
    // Compress using LZ-String with URI-safe encoding
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    
    return compressed;
  } catch (error) {
    console.error('Failed to encode graph:', error);
    throw new Error('Failed to encode graph for sharing');
  }
}

/**
 * Decodes a graph from a URL-safe compressed string
 */
export function decodeGraphFromUrl(encoded: string): ArrowGraph | null {
  try {
    // Decompress from URI-safe format
    const jsonString = LZString.decompressFromEncodedURIComponent(encoded);
    
    if (!jsonString) {
      console.error('Failed to decompress graph data');
      return null;
    }
    
    // Parse JSON
    const graph = JSON.parse(jsonString) as ArrowGraph;
    
    // Basic validation
    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      console.error('Invalid graph: missing nodes array');
      return null;
    }
    
    if (!graph.relationships || !Array.isArray(graph.relationships)) {
      console.error('Invalid graph: missing relationships array');
      return null;
    }
    
    return graph;
  } catch (error) {
    console.error('Failed to decode graph:', error);
    return null;
  }
}

/**
 * Creates a full shareable URL for a graph
 */
export function createShareableUrl(graph: ArrowGraph, baseUrl?: string): string {
  const encoded = encodeGraphToUrl(graph);
  
  // Use the current origin if no base URL provided
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  const url = new URL(`${base}${basePath}/`);
  url.searchParams.set(URL_PARAM_KEY, encoded);
  
  return url.toString();
}

/**
 * Extracts encoded graph data from URL search params
 */
export function getGraphFromUrlParams(searchParams: URLSearchParams): string | null {
  return searchParams.get(URL_PARAM_KEY);
}

/**
 * Checks if the current URL contains shared graph data
 */
export function hasSharedGraphInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has(URL_PARAM_KEY);
}

/**
 * Loads a shared graph from the current URL
 */
export function loadSharedGraphFromUrl(): ArrowGraph | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(URL_PARAM_KEY);
  
  if (!encoded) return null;
  
  return decodeGraphFromUrl(encoded);
}

/**
 * Clears the graph parameter from the URL without page reload
 */
export function clearGraphFromUrl(): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.delete(URL_PARAM_KEY);
  
  // Update URL without triggering navigation
  window.history.replaceState({}, '', url.toString());
}

/**
 * Copies a shareable URL to clipboard
 */
export async function copyShareableUrlToClipboard(graph: ArrowGraph): Promise<boolean> {
  try {
    const url = createShareableUrl(graph);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Gets the estimated URL length for a graph (useful for warnings about URL limits)
 */
export function getEstimatedUrlLength(graph: ArrowGraph): number {
  try {
    const encoded = encodeGraphToUrl(graph);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    // Estimate: base URL (~50 chars) + path + "?g=" + encoded
    return 50 + basePath.length + 3 + encoded.length;
  } catch {
    return 0;
  }
}

/**
 * Maximum recommended URL length (most browsers support ~2000-8000 chars)
 * Being conservative with 8000 to support most scenarios
 */
export const MAX_RECOMMENDED_URL_LENGTH = 8000;

/**
 * Checks if a graph is too large to share via URL
 */
export function isGraphTooLargeForUrl(graph: ArrowGraph): boolean {
  return getEstimatedUrlLength(graph) > MAX_RECOMMENDED_URL_LENGTH;
}
