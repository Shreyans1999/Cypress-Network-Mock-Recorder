import { defineConfig } from 'cypress';
import * as fs from 'fs';
import * as path from 'path';

export default defineConfig({
    e2e: {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        specPattern: 'cypress/e2e/**/*.cy.ts',
        supportFile: 'cypress/support/e2e.ts',
        fixturesFolder: 'cypress/fixtures',
        video: true,
        videosFolder: 'cypress/videos',
        screenshotsFolder: 'cypress/screenshots',
        screenshotOnRunFailure: true,

        setupNodeEvents(on, config) {
            // Task for reading mock files
            on('task', {
                readMock({ filePath }: { filePath: string }) {
                    const fullPath = path.resolve(filePath);
                    if (fs.existsSync(fullPath)) {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        return JSON.parse(content);
                    }
                    return null;
                },

                // Task for writing mock files
                writeMock({ filePath, data }: { filePath: string; data: object }) {
                    const fullPath = path.resolve(filePath);
                    const dir = path.dirname(fullPath);

                    // Create directory if it doesn't exist
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }

                    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
                    return true;
                },

                // Task for listing mock files
                listMocks({ dirPath }: { dirPath: string }) {
                    const fullPath = path.resolve(dirPath);
                    if (!fs.existsSync(fullPath)) {
                        return [];
                    }

                    const files: string[] = [];
                    const walkDir = (dir: string) => {
                        const items = fs.readdirSync(dir);
                        for (const item of items) {
                            const itemPath = path.join(dir, item);
                            const stat = fs.statSync(itemPath);
                            if (stat.isDirectory()) {
                                walkDir(itemPath);
                            } else if (item.endsWith('.json')) {
                                files.push(path.relative(fullPath, itemPath));
                            }
                        }
                    };

                    walkDir(fullPath);
                    return files;
                },

                // Task for clearing mock files
                clearMocks({ dirPath }: { dirPath: string }) {
                    const fullPath = path.resolve(dirPath);
                    if (fs.existsSync(fullPath)) {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                    }
                    fs.mkdirSync(fullPath, { recursive: true });
                    return true;
                },

                // Task for checking if mock exists
                mockExists({ filePath }: { filePath: string }) {
                    return fs.existsSync(path.resolve(filePath));
                },

                // Log to console (for debugging)
                log(message: string) {
                    console.log(message);
                    return null;
                }
            });

            return config;
        },
    },

    env: {
        MODE: 'replay', // Default mode: 'record' or 'replay'
        MOCK_DIR: 'cypress/mocks',
        AUTO_FALLBACK: true, // If mock missing, hit real API and record
        SANITIZE_AUTH: true, // Remove auth headers
        SANITIZE_COOKIES: true, // Remove cookies
        LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
    },
});
