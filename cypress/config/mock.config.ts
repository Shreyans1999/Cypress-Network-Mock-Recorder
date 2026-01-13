/**
 * Mock Configuration
 * Central configuration for the Network Mock Recorder
 */

export interface MockConfig {
    /** Directory to store mock files */
    mockDir: string;

    /** URL patterns to record (regex strings) */
    includePatterns: string[];

    /** URL patterns to ignore (regex strings) */
    excludePatterns: string[];

    /** Headers to sanitize/remove */
    sanitizeHeaders: string[];

    /** Enable auto-fallback to real API when mock is missing */
    autoFallback: boolean;

    /** Log level */
    logLevel: 'debug' | 'info' | 'warn' | 'error';

    /** Enable response time simulation */
    simulateLatency: boolean;

    /** Dynamic placeholder pattern */
    dynamicPlaceholder: string;
}

export const defaultConfig: MockConfig = {
    mockDir: 'cypress/mocks',

    // Record all API calls by default
    includePatterns: [
        '^/api/',
        '^https?://.*/(api|graphql|v[0-9]+)/',
    ],

    // Exclude static assets and common non-API paths
    excludePatterns: [
        '\\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico)$',
        '^/static/',
        '^/assets/',
        '^/_next/',
        '^/__cypress/',
    ],

    // Headers to remove for security
    sanitizeHeaders: [
        'authorization',
        'cookie',
        'set-cookie',
        'x-auth-token',
        'x-api-key',
        'x-access-token',
        'x-csrf-token',
        'x-xsrf-token',
    ],

    autoFallback: true,
    logLevel: 'info',
    simulateLatency: false,
    dynamicPlaceholder: '{{DYNAMIC}}',
};

/**
 * PII patterns to sanitize from response bodies
 */
export const piiPatterns = [
    // Email addresses
    { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '***EMAIL***' },

    // Phone numbers (various formats)
    { pattern: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '***PHONE***' },

    // Credit card numbers
    { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '***CARD***' },

    // SSN
    { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replacement: '***SSN***' },

    // JWT tokens
    { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, replacement: '***JWT***' },
];

/**
 * Get configuration merged with Cypress env
 */
export function getConfig(): MockConfig {
    const envConfig: Partial<MockConfig> = {};

    if (typeof Cypress !== 'undefined') {
        if (Cypress.env('MOCK_DIR')) {
            envConfig.mockDir = Cypress.env('MOCK_DIR');
        }
        if (Cypress.env('AUTO_FALLBACK') !== undefined) {
            envConfig.autoFallback = Cypress.env('AUTO_FALLBACK');
        }
        if (Cypress.env('LOG_LEVEL')) {
            envConfig.logLevel = Cypress.env('LOG_LEVEL');
        }
    }

    return { ...defaultConfig, ...envConfig };
}
