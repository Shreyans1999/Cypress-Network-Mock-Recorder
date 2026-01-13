/**
 * Network Recorder
 * Core interceptor for recording and replaying API traffic
 */

import { getConfig } from '../config/mock.config';
import {
    createRequestSignature,
    shouldRecordUrl,
    RequestSignature
} from './matcher';
import { sanitizeHeaders, sanitizeUrl } from './sanitizer';
import { saveMock, loadMock, log } from './mockStorage';

/** Global state for the recorder */
let isRecording = false;
let isReplaying = false;
let interceptedRequests = 0;
let recordedRequests = 0;
let replayedRequests = 0;

export interface NetworkRecorderState {
    isRecording: boolean;
    isReplaying: boolean;
    interceptedRequests: number;
    recordedRequests: number;
    replayedRequests: number;
}

/**
 * Get current mode from environment
 */
export function getMode(): 'record' | 'replay' | 'passthrough' {
    const mode = Cypress.env('MODE')?.toLowerCase();
    if (mode === 'record') return 'record';
    if (mode === 'replay' || mode === 'mock') return 'replay';
    return 'passthrough';
}

/**
 * Initialize the network recorder
 * Sets up interceptors based on current mode
 */
export function initNetworkRecorder(): void {
    const mode = getMode();
    const config = getConfig();

    log('info', `🎬 Initializing Network Mock Recorder in ${mode.toUpperCase()} mode`);

    // Reset state
    interceptedRequests = 0;
    recordedRequests = 0;
    replayedRequests = 0;

    if (mode === 'record') {
        isRecording = true;
        isReplaying = false;
        setupRecordMode();
    } else if (mode === 'replay') {
        isRecording = false;
        isReplaying = true;
        setupReplayMode();
    } else {
        isRecording = false;
        isReplaying = false;
        log('info', '⏭️ Passthrough mode - no recording or replaying');
    }
}

/**
 * Setup record mode interceptors
 */
function setupRecordMode(): void {
    log('info', '🔴 RECORD mode active - capturing real API responses');

    // Intercept all requests
    cy.intercept('**', (req) => {
        const url = req.url;

        // Check if this URL should be recorded
        if (!shouldRecordUrl(url)) {
            log('debug', `⏭️ Skipping (excluded): ${url}`);
            req.continue();
            return;
        }

        interceptedRequests++;
        const startTime = Date.now();

        log('debug', `📡 Intercepting: ${req.method} ${url}`);

        // Continue to real server and capture response
        req.continue((res) => {
            const responseTime = Date.now() - startTime;

            // Save the mock
            saveMock(
                {
                    method: req.method,
                    url: req.url,
                    headers: sanitizeHeaders(req.headers as Record<string, string>),
                    body: req.body,
                },
                {
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    headers: res.headers ? sanitizeHeaders(res.headers as Record<string, string>) : undefined,
                    body: res.body,
                },
                responseTime
            ).then(() => {
                recordedRequests++;
            });
        });
    });
}

/**
 * Setup replay mode interceptors
 */
function setupReplayMode(): void {
    const config = getConfig();

    log('info', '🟢 REPLAY mode active - serving mocked responses');

    // Intercept all requests
    cy.intercept('**', (req) => {
        const url = req.url;

        // Check if this URL should be intercepted
        if (!shouldRecordUrl(url)) {
            log('debug', `⏭️ Skipping (excluded): ${url}`);
            req.continue();
            return;
        }

        interceptedRequests++;
        const signature = createRequestSignature(req.method, url);

        log('debug', `🔍 Looking for mock: ${req.method} ${signature.pathname}`);

        // Try to load mock
        loadMock(signature).then((mock) => {
            if (mock) {
                replayedRequests++;
                log('info', `✅ Replaying mock: ${req.method} ${signature.pathname}`);

                // Serve the mocked response
                req.reply({
                    statusCode: mock.status,
                    body: mock.response,
                    headers: mock.responseHeaders as Record<string, string>,
                });
            } else if (config.autoFallback) {
                // Fallback to real API and record
                log('warn', `⚠️ Mock not found, falling back to real API: ${req.method} ${url}`);

                const startTime = Date.now();

                req.continue((res) => {
                    const responseTime = Date.now() - startTime;

                    // Auto-record for next time
                    saveMock(
                        {
                            method: req.method,
                            url: req.url,
                            headers: sanitizeHeaders(req.headers as Record<string, string>),
                            body: req.body,
                        },
                        {
                            statusCode: res.statusCode,
                            statusMessage: res.statusMessage,
                            headers: res.headers ? sanitizeHeaders(res.headers as Record<string, string>) : undefined,
                            body: res.body,
                        },
                        responseTime
                    );

                    log('info', `📝 Auto-recorded missing mock: ${req.method} ${signature.pathname}`);
                });
            } else {
                // No mock and no fallback - fail the request
                log('error', `❌ Mock not found and fallback disabled: ${req.method} ${url}`);
                req.reply({
                    statusCode: 500,
                    body: {
                        error: 'Mock not found',
                        message: `No mock available for ${req.method} ${url}`,
                        hint: 'Run tests with MODE=record first, or enable AUTO_FALLBACK',
                    },
                });
            }
        });
    });
}

/**
 * Stop the network recorder
 */
export function stopNetworkRecorder(): void {
    isRecording = false;
    isReplaying = false;

    log('info', '⏹️ Network Mock Recorder stopped');
    log('info', `📊 Stats: ${interceptedRequests} intercepted, ${recordedRequests} recorded, ${replayedRequests} replayed`);
}

/**
 * Get current recorder state
 */
export function getRecorderState(): NetworkRecorderState {
    return {
        isRecording,
        isReplaying,
        interceptedRequests,
        recordedRequests,
        replayedRequests,
    };
}
