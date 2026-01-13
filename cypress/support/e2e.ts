/**
 * E2E Support File
 * Imports all custom commands and sets up global hooks
 */

// Import custom commands
import './commands';

// Import modules for type augmentation
import './networkRecorder';
import './matcher';
import './sanitizer';
import './mockStorage';

// Log startup info
beforeEach(() => {
    const mode = Cypress.env('MODE') || 'passthrough';
    cy.log(`🎬 Network Mock Recorder - Mode: ${mode.toUpperCase()}`);
});

// Cleanup after each test
afterEach(() => {
    // Could add cleanup logic here if needed
});
