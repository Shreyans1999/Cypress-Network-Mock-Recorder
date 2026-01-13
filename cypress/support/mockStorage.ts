/**
 * Mock Storage
 * File-based persistence for recorded mocks
 */

import { getConfig } from '../config/mock.config';
import { createRequestSignature, generateMockPath, RequestSignature } from './matcher';

export interface RecordedMock {
    /** HTTP method */
    method: string;

    /** Original URL */
    url: string;

    /** Pathname without query string */
    pathname: string;

    /** Query parameters */
    queryParams: Record<string, string>;

    /** Response status code */
    status: number;

    /** Response status message */
    statusMessage?: string;

    /** Sanitized request headers */
    requestHeaders?: Record<string, string | string[]>;

    /** Sanitized response headers */
    responseHeaders?: Record<string, string | string[]>;

    /** Request body (if any) */
    requestBody?: unknown;

    /** Response body */
    response: unknown;

    /** Response time in ms */
    responseTime?: number;

    /** Timestamp when recorded */
    recordedAt: string;

    /** Version for mock versioning */
    version?: string;

    /** Custom metadata */
    metadata?: Record<string, unknown>;
}

/** In-memory mock cache for replay mode */
const mockCache = new Map<string, RecordedMock>();

/** List of recorded mocks in current session */
const sessionMocks: string[] = [];

/**
 * Save a mock to the filesystem
 */
export function saveMock(
    request: {
        method: string;
        url: string;
        headers?: Record<string, string | string[]>;
        body?: unknown;
    },
    response: {
        statusCode: number;
        statusMessage?: string;
        headers?: Record<string, string | string[]>;
        body: unknown;
    },
    responseTime?: number
): Cypress.Chainable<string> {
    const signature = createRequestSignature(request.method, request.url);
    const filePath = generateMockPath(signature);

    const mock: RecordedMock = {
        method: signature.method,
        url: request.url,
        pathname: signature.pathname,
        queryParams: signature.queryParams,
        status: response.statusCode,
        statusMessage: response.statusMessage,
        requestHeaders: request.headers,
        responseHeaders: response.headers,
        requestBody: request.body,
        response: response.body,
        responseTime,
        recordedAt: new Date().toISOString(),
    };

    return cy.task('writeMock', { filePath, data: mock }, { log: false }).then(() => {
        sessionMocks.push(filePath);
        log('info', `📝 Recorded mock: ${signature.method} ${signature.pathname} -> ${filePath}`);
        return filePath;
    });
}

/**
 * Load a mock from the filesystem
 */
export function loadMock(signature: RequestSignature): Cypress.Chainable<RecordedMock | null> {
    const filePath = generateMockPath(signature);
    const cacheKey = `${signature.method}:${signature.normalizedUrl}`;

    // Check cache first
    if (mockCache.has(cacheKey)) {
        return cy.wrap(mockCache.get(cacheKey)!, { log: false });
    }

    return cy.task('readMock', { filePath }, { log: false }).then((mock: RecordedMock | null) => {
        if (mock) {
            mockCache.set(cacheKey, mock);
            log('debug', `📂 Loaded mock from cache: ${filePath}`);
        }
        return mock;
    });
}

/**
 * Check if a mock exists for this request
 */
export function mockExists(signature: RequestSignature): Cypress.Chainable<boolean> {
    const filePath = generateMockPath(signature);
    return cy.task('mockExists', { filePath }, { log: false }) as Cypress.Chainable<boolean>;
}

/**
 * Get all recorded mocks
 */
export function listMocks(): Cypress.Chainable<string[]> {
    const config = getConfig();
    return cy.task('listMocks', { dirPath: config.mockDir }, { log: false }) as Cypress.Chainable<string[]>;
}

/**
 * Clear all mocks
 */
export function clearAllMocks(): Cypress.Chainable<boolean> {
    const config = getConfig();
    mockCache.clear();
    sessionMocks.length = 0;
    return cy.task('clearMocks', { dirPath: config.mockDir }, { log: false }) as Cypress.Chainable<boolean>;
}

/**
 * Get mocks recorded in current session
 */
export function getSessionMocks(): string[] {
    return [...sessionMocks];
}

/**
 * Clear the in-memory cache
 */
export function clearCache(): void {
    mockCache.clear();
}

/**
 * Preload mocks into cache for faster replay
 */
export function preloadMocks(): Cypress.Chainable<number> {
    const config = getConfig();

    return listMocks().then((files) => {
        const loadPromises = files.map((file) => {
            const filePath = `${config.mockDir}/${file}`;
            return cy.task('readMock', { filePath }, { log: false }).then((mock: RecordedMock | null) => {
                if (mock) {
                    const signature = createRequestSignature(mock.method, mock.url);
                    const cacheKey = `${signature.method}:${signature.normalizedUrl}`;
                    mockCache.set(cacheKey, mock);
                }
            });
        });

        return cy.wrap(Promise.all(loadPromises)).then(() => {
            log('info', `📦 Preloaded ${mockCache.size} mocks into cache`);
            return mockCache.size;
        });
    });
}

/**
 * Log helper based on config log level
 */
function log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const config = getConfig();
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(config.logLevel);
    const msgLevel = levels.indexOf(level);

    if (msgLevel >= configLevel) {
        switch (level) {
            case 'debug':
                console.log(`[MOCK DEBUG] ${message}`);
                break;
            case 'info':
                console.log(`[MOCK] ${message}`);
                break;
            case 'warn':
                console.warn(`[MOCK WARN] ${message}`);
                break;
            case 'error':
                console.error(`[MOCK ERROR] ${message}`);
                break;
        }
    }
}

export { log };
