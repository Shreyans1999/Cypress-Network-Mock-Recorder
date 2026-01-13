/**
 * Request Matcher
 * Intelligent matching engine for API requests
 */

import { getConfig } from '../config/mock.config';

export interface RequestSignature {
    method: string;
    url: string;
    normalizedUrl: string;
    queryParams: Record<string, string>;
    pathname: string;
}

export interface MockMetadata {
    method: string;
    url: string;
    pathname: string;
    queryParams?: Record<string, string>;
}

/**
 * Normalize URL by sorting query parameters
 */
export function normalizeUrl(url: string): string {
    try {
        // Handle relative URLs
        const baseUrl = url.startsWith('http') ? '' : 'http://localhost';
        const urlObj = new URL(url, baseUrl);

        // Sort query parameters
        const params = new URLSearchParams(urlObj.search);
        const sortedParams = new URLSearchParams([...params.entries()].sort());

        // Reconstruct normalized URL
        const normalizedSearch = sortedParams.toString();
        const search = normalizedSearch ? `?${normalizedSearch}` : '';

        if (url.startsWith('http')) {
            return `${urlObj.origin}${urlObj.pathname}${search}`;
        }
        return `${urlObj.pathname}${search}`;
    } catch {
        return url;
    }
}

/**
 * Extract pathname from URL
 */
export function extractPathname(url: string): string {
    try {
        const baseUrl = url.startsWith('http') ? '' : 'http://localhost';
        const urlObj = new URL(url, baseUrl);
        return urlObj.pathname;
    } catch {
        return url.split('?')[0];
    }
}

/**
 * Extract query parameters from URL
 */
export function extractQueryParams(url: string): Record<string, string> {
    try {
        const baseUrl = url.startsWith('http') ? '' : 'http://localhost';
        const urlObj = new URL(url, baseUrl);
        const params: Record<string, string> = {};
        urlObj.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        return params;
    } catch {
        return {};
    }
}

/**
 * Create request signature for matching
 */
export function createRequestSignature(method: string, url: string): RequestSignature {
    return {
        method: method.toUpperCase(),
        url,
        normalizedUrl: normalizeUrl(url),
        queryParams: extractQueryParams(url),
        pathname: extractPathname(url),
    };
}

/**
 * Generate a unique filename for a mock based on request signature
 */
export function generateMockFilename(signature: RequestSignature): string {
    // Clean pathname for filesystem
    let cleanPath = signature.pathname
        .replace(/^\//, '') // Remove leading slash
        .replace(/\//g, '_') // Replace slashes with underscores
        .replace(/[^a-zA-Z0-9_-]/g, '') // Remove special characters
        || 'root';

    // Add query params hash if present
    const queryString = Object.keys(signature.queryParams)
        .sort()
        .map(k => `${k}=${signature.queryParams[k]}`)
        .join('&');

    if (queryString) {
        // Create a simple hash of query params
        const hash = simpleHash(queryString);
        cleanPath += `_${hash}`;
    }

    return `${signature.method.toLowerCase()}_${cleanPath}.json`;
}

/**
 * Generate mock file path
 */
export function generateMockPath(signature: RequestSignature): string {
    const config = getConfig();
    const filename = generateMockFilename(signature);

    // Organize by pathname segments
    const pathSegments = signature.pathname
        .split('/')
        .filter(s => s && !s.match(/^\d+$/)) // Filter out IDs
        .slice(0, 2); // Take first 2 segments for organization

    const subDir = pathSegments.join('/') || 'api';

    return `${config.mockDir}/${subDir}/${filename}`;
}

/**
 * Simple hash function for query params
 */
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 6);
}

/**
 * Check if URL should be recorded based on config patterns
 */
export function shouldRecordUrl(url: string): boolean {
    const config = getConfig();

    // Check exclude patterns first
    for (const pattern of config.excludePatterns) {
        if (new RegExp(pattern, 'i').test(url)) {
            return false;
        }
    }

    // Check include patterns
    for (const pattern of config.includePatterns) {
        if (new RegExp(pattern, 'i').test(url)) {
            return true;
        }
    }

    // Default: record if no patterns match
    return true;
}

/**
 * Match a request against stored mock metadata
 */
export function matchRequest(
    request: RequestSignature,
    mock: MockMetadata
): boolean {
    // Method must match exactly
    if (request.method.toUpperCase() !== mock.method.toUpperCase()) {
        return false;
    }

    // Pathname must match
    if (request.pathname !== mock.pathname) {
        return false;
    }

    // Query params should match (if specified in mock)
    if (mock.queryParams && Object.keys(mock.queryParams).length > 0) {
        for (const [key, value] of Object.entries(mock.queryParams)) {
            if (request.queryParams[key] !== value) {
                return false;
            }
        }
    }

    return true;
}
