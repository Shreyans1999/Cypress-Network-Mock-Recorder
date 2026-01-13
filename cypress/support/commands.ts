/**
 * Custom Cypress Commands
 * Extends Cypress with network mocking capabilities
 */

import { initNetworkRecorder, stopNetworkRecorder, getRecorderState, getMode } from './networkRecorder';
import { clearAllMocks, listMocks, preloadMocks, getSessionMocks } from './mockStorage';
import { getConfig } from '../config/mock.config';

// Extend Cypress types
declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Enable network mocking based on MODE environment variable
             * @example cy.enableNetworkMocking()
             */
            enableNetworkMocking(): Chainable<void>;

            /**
             * Disable network mocking
             * @example cy.disableNetworkMocking()
             */
            disableNetworkMocking(): Chainable<void>;

            /**
             * Clear all recorded mocks
             * @example cy.clearMocks()
             */
            clearMocks(): Chainable<void>;

            /**
             * List all available mocks
             * @example cy.listMocks().then(mocks => console.log(mocks))
             */
            listMocks(): Chainable<string[]>;

            /**
             * Preload all mocks into memory for faster replay
             * @example cy.preloadMocks()
             */
            preloadMocks(): Chainable<number>;

            /**
             * Get mocks recorded in the current test session
             * @example cy.getSessionMocks().then(mocks => console.log(mocks))
             */
            getSessionMocks(): Chainable<string[]>;

            /**
             * Get the current recorder state
             * @example cy.getRecorderState().then(state => console.log(state))
             */
            getRecorderState(): Chainable<{
                isRecording: boolean;
                isReplaying: boolean;
                interceptedRequests: number;
                recordedRequests: number;
                replayedRequests: number;
            }>;

            /**
             * Get the current mode (record/replay/passthrough)
             * @example cy.getMode().then(mode => console.log(mode))
             */
            getMode(): Chainable<'record' | 'replay' | 'passthrough'>;
        }
    }
}

// Register commands
Cypress.Commands.add('enableNetworkMocking', () => {
    const mode = getMode();

    Cypress.log({
        name: 'enableNetworkMocking',
        displayName: '🎬 MOCK',
        message: `Enabled in ${mode.toUpperCase()} mode`,
        consoleProps: () => ({
            mode,
            config: getConfig(),
        }),
    });

    initNetworkRecorder();
});

Cypress.Commands.add('disableNetworkMocking', () => {
    const state = getRecorderState();

    Cypress.log({
        name: 'disableNetworkMocking',
        displayName: '⏹️ MOCK',
        message: `Disabled - ${state.interceptedRequests} requests processed`,
        consoleProps: () => state,
    });

    stopNetworkRecorder();
});

Cypress.Commands.add('clearMocks', () => {
    Cypress.log({
        name: 'clearMocks',
        displayName: '🗑️ MOCK',
        message: 'Clearing all recorded mocks',
    });

    return clearAllMocks().then(() => {
        Cypress.log({
            name: 'clearMocks',
            displayName: '✅ MOCK',
            message: 'All mocks cleared',
        });
    });
});

Cypress.Commands.add('listMocks', () => {
    return listMocks().then((mocks) => {
        Cypress.log({
            name: 'listMocks',
            displayName: '📋 MOCK',
            message: `Found ${mocks.length} mocks`,
            consoleProps: () => ({ mocks }),
        });
        return mocks;
    });
});

Cypress.Commands.add('preloadMocks', () => {
    Cypress.log({
        name: 'preloadMocks',
        displayName: '📦 MOCK',
        message: 'Preloading mocks into cache',
    });

    return preloadMocks().then((count) => {
        Cypress.log({
            name: 'preloadMocks',
            displayName: '✅ MOCK',
            message: `Preloaded ${count} mocks`,
        });
        return count;
    });
});

Cypress.Commands.add('getSessionMocks', () => {
    const mocks = getSessionMocks();

    Cypress.log({
        name: 'getSessionMocks',
        displayName: '📝 MOCK',
        message: `${mocks.length} mocks recorded this session`,
        consoleProps: () => ({ mocks }),
    });

    return cy.wrap(mocks);
});

Cypress.Commands.add('getRecorderState', () => {
    const state = getRecorderState();

    Cypress.log({
        name: 'getRecorderState',
        displayName: '📊 MOCK',
        message: `Recording: ${state.isRecording}, Replaying: ${state.isReplaying}`,
        consoleProps: () => state,
    });

    return cy.wrap(state);
});

Cypress.Commands.add('getMode', () => {
    const mode = getMode();

    Cypress.log({
        name: 'getMode',
        displayName: '🎯 MOCK',
        message: `Current mode: ${mode}`,
    });

    return cy.wrap(mode);
});
