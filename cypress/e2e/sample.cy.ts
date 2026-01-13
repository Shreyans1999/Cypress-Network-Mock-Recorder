/**
 * Sample E2E Test
 * Demonstrates the Network Mock Recorder in action
 */

describe('Network Mock Recorder Demo', () => {
    beforeEach(() => {
        // Enable network mocking before each test
        cy.enableNetworkMocking();
    });

    afterEach(() => {
        // Disable and log stats after each test
        cy.disableNetworkMocking();

        // Show what was recorded/replayed
        cy.getRecorderState().then((state) => {
            cy.log(`📊 Intercepted: ${state.interceptedRequests}`);
            cy.log(`📝 Recorded: ${state.recordedRequests}`);
            cy.log(`▶️ Replayed: ${state.replayedRequests}`);
        });
    });

    describe('JSONPlaceholder API Tests', () => {
        it('should fetch posts', () => {
            // This will:
            // - In RECORD mode: Hit the real API and save the response
            // - In REPLAY mode: Serve the cached response
            cy.request('GET', '/posts').then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.be.an('array');
                expect(response.body.length).to.be.greaterThan(0);

                // Verify post structure
                const firstPost = response.body[0];
                expect(firstPost).to.have.property('id');
                expect(firstPost).to.have.property('title');
                expect(firstPost).to.have.property('body');
                expect(firstPost).to.have.property('userId');
            });
        });

        it('should fetch a single post by ID', () => {
            cy.request('GET', '/posts/1').then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.be.an('object');
                expect(response.body.id).to.eq(1);
                expect(response.body).to.have.property('title');
            });
        });

        it('should fetch users', () => {
            cy.request('GET', '/users').then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.be.an('array');

                const firstUser = response.body[0];
                expect(firstUser).to.have.property('id');
                expect(firstUser).to.have.property('name');
                expect(firstUser).to.have.property('email');
                expect(firstUser).to.have.property('username');
            });
        });

        it('should fetch comments for a post', () => {
            cy.request('GET', '/posts/1/comments').then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.be.an('array');

                const firstComment = response.body[0];
                expect(firstComment).to.have.property('postId');
                expect(firstComment).to.have.property('email');
                expect(firstComment).to.have.property('body');
            });
        });

        it('should create a new post (POST request)', () => {
            const newPost = {
                title: 'Test Post from Cypress',
                body: 'This is a test post created by the Network Mock Recorder',
                userId: 1,
            };

            cy.request('POST', '/posts', newPost).then((response) => {
                expect(response.status).to.eq(201);
                expect(response.body).to.have.property('id');
                expect(response.body.title).to.eq(newPost.title);
            });
        });

        it('should update a post (PUT request)', () => {
            const updatedPost = {
                id: 1,
                title: 'Updated Title',
                body: 'Updated body content',
                userId: 1,
            };

            cy.request('PUT', '/posts/1', updatedPost).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body.title).to.eq(updatedPost.title);
            });
        });

        it('should partial update a post (PATCH request)', () => {
            cy.request('PATCH', '/posts/1', { title: 'Patched Title' }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body.title).to.eq('Patched Title');
            });
        });

        it('should delete a post', () => {
            cy.request('DELETE', '/posts/1').then((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });

    describe('Query Parameters Tests', () => {
        it('should fetch filtered posts', () => {
            cy.request('GET', '/posts?userId=1').then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.be.an('array');

                // All posts should belong to userId 1
                response.body.forEach((post: { userId: number }) => {
                    expect(post.userId).to.eq(1);
                });
            });
        });

        it('should handle multiple query params', () => {
            cy.request('GET', '/comments?postId=1&id=1').then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.be.an('array');
            });
        });
    });
});

describe('Mock Management', () => {
    it('should list all available mocks', () => {
        cy.listMocks().then((mocks) => {
            cy.log(`📋 Available mocks: ${mocks.length}`);
            mocks.forEach((mock) => cy.log(`  - ${mock}`));
        });
    });

    it('should show session mocks after requests', () => {
        cy.enableNetworkMocking();

        cy.request('GET', '/todos').then((response) => {
            expect(response.status).to.eq(200);
        });

        cy.getSessionMocks().then((mocks) => {
            cy.log(`📝 Session mocks: ${mocks.length}`);
        });

        cy.disableNetworkMocking();
    });
});
