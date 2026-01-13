/**
 * Data Sanitizer
 * Removes sensitive data before storing mocks
 */

import { getConfig, piiPatterns } from '../config/mock.config';

export interface SanitizeOptions {
    sanitizeHeaders?: boolean;
    sanitizeCookies?: boolean;
    sanitizePII?: boolean;
    maskAuthValues?: boolean;
}

const defaultSanitizeOptions: SanitizeOptions = {
    sanitizeHeaders: true,
    sanitizeCookies: true,
    sanitizePII: false, // Disabled by default as it may alter test data
    maskAuthValues: true,
};

/**
 * Sanitize request/response headers
 */
export function sanitizeHeaders(
    headers: Record<string, string | string[]>,
    options: SanitizeOptions = defaultSanitizeOptions
): Record<string, string | string[]> {
    if (!options.sanitizeHeaders) {
        return headers;
    }

    const config = getConfig();
    const sanitized: Record<string, string | string[]> = {};

    for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();

        // Check if header should be removed
        if (config.sanitizeHeaders.some(h => lowerKey === h.toLowerCase())) {
            if (options.maskAuthValues) {
                sanitized[key] = '***REMOVED***';
            }
            // Skip entirely if not masking
            continue;
        }

        // Handle cookies separately
        if (options.sanitizeCookies && (lowerKey === 'cookie' || lowerKey === 'set-cookie')) {
            sanitized[key] = '***REMOVED***';
            continue;
        }

        sanitized[key] = value;
    }

    return sanitized;
}

/**
 * Sanitize response body for PII
 */
export function sanitizeBody(
    body: unknown,
    options: SanitizeOptions = defaultSanitizeOptions
): unknown {
    if (!options.sanitizePII) {
        return body;
    }

    if (typeof body === 'string') {
        return sanitizeString(body);
    }

    if (Array.isArray(body)) {
        return body.map(item => sanitizeBody(item, options));
    }

    if (body && typeof body === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(body)) {
            sanitized[key] = sanitizeBody(value, options);
        }
        return sanitized;
    }

    return body;
}

/**
 * Sanitize a string for PII patterns
 */
function sanitizeString(str: string): string {
    let result = str;

    for (const { pattern, replacement } of piiPatterns) {
        result = result.replace(pattern, replacement);
    }

    return result;
}

/**
 * Sanitize URL by removing sensitive query parameters
 */
export function sanitizeUrl(url: string): string {
    const sensitiveParams = [
        'token',
        'access_token',
        'api_key',
        'apikey',
        'auth',
        'key',
        'secret',
        'password',
        'pwd',
    ];

    try {
        const baseUrl = url.startsWith('http') ? '' : 'http://localhost';
        const urlObj = new URL(url, baseUrl);

        for (const param of sensitiveParams) {
            if (urlObj.searchParams.has(param)) {
                urlObj.searchParams.set(param, '***REMOVED***');
            }
        }

        if (url.startsWith('http')) {
            return urlObj.toString();
        }
        return `${urlObj.pathname}${urlObj.search}`;
    } catch {
        return url;
    }
}

/**
 * Apply dynamic placeholders to response data
 */
export function applyDynamicPlaceholders(
    data: unknown,
    patterns: { field: string; value: string }[]
): unknown {
    const config = getConfig();

    if (typeof data === 'string') {
        let result = data;
        for (const { field, value } of patterns) {
            if (data.includes(value)) {
                result = result.replace(new RegExp(escapeRegex(value), 'g'), `{{${field}}}`);
            }
        }
        return result;
    }

    if (Array.isArray(data)) {
        return data.map(item => applyDynamicPlaceholders(item, patterns));
    }

    if (data && typeof data === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            // Check if this field should use dynamic placeholder
            const matchingPattern = patterns.find(p => p.field === key);
            if (matchingPattern && value === matchingPattern.value) {
                result[key] = config.dynamicPlaceholder;
            } else {
                result[key] = applyDynamicPlaceholders(value, patterns);
            }
        }
        return result;
    }

    return data;
}

/**
 * Resolve dynamic placeholders with actual values
 */
export function resolveDynamicPlaceholders(
    data: unknown,
    values: Record<string, unknown>
): unknown {
    const config = getConfig();

    if (typeof data === 'string') {
        if (data === config.dynamicPlaceholder) {
            return values['_default'] ?? data;
        }

        let result = data;
        for (const [key, value] of Object.entries(values)) {
            result = result.replace(`{{${key}}}`, String(value));
        }
        return result;
    }

    if (Array.isArray(data)) {
        return data.map(item => resolveDynamicPlaceholders(item, values));
    }

    if (data && typeof data === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            if (value === config.dynamicPlaceholder && key in values) {
                result[key] = values[key];
            } else {
                result[key] = resolveDynamicPlaceholders(value, values);
            }
        }
        return result;
    }

    return data;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Full sanitization pipeline for recorded data
 */
export function sanitizeRecordedData(
    data: {
        url: string;
        requestHeaders?: Record<string, string | string[]>;
        responseHeaders?: Record<string, string | string[]>;
        requestBody?: unknown;
        responseBody?: unknown;
    },
    options: SanitizeOptions = defaultSanitizeOptions
): typeof data {
    return {
        url: sanitizeUrl(data.url),
        requestHeaders: data.requestHeaders
            ? sanitizeHeaders(data.requestHeaders, options)
            : undefined,
        responseHeaders: data.responseHeaders
            ? sanitizeHeaders(data.responseHeaders, options)
            : undefined,
        requestBody: data.requestBody
            ? sanitizeBody(data.requestBody, options)
            : undefined,
        responseBody: data.responseBody
            ? sanitizeBody(data.responseBody, options)
            : undefined,
    };
}
