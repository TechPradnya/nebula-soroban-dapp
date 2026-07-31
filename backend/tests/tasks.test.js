const request = require('supertest');
const createApp = require('../src/app');
const Task = require('../src/models/Task');

const app = createApp();

async function seedTask(overrides = {}) {
  return Task.create({
    onChainId: overrides.onChainId ?? Math.floor(Math.random() * 100000),
    title: 'Build a Soroban landing page',
    description: 'Need a responsive marketing site for a Stellar dApp launch.',
    category: 'development',
    tags: ['react', 'stellar'],
    clientAddress: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW',
    amount: '5000000000',
    feeBps: 500,
    status: 'open',
    ...overrides,
  });
}

describe('Tasks API', () => {
  test('lists tasks with pagination metadata', async () => {
    await seedTask({ onChainId: 1 });
    await seedTask({ onChainId: 2, status: 'completed' });

    const res = await request(app).get('/api/v1/tasks').query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  test('filters tasks by status', async () => {
    await seedTask({ onChainId: 3, status: 'open' });
    await seedTask({ onChainId: 4, status: 'completed' });

    const res = await request(app).get('/api/v1/tasks').query({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('completed');
  });

  test('returns 404 for a task that does not exist', async () => {
    const res = await request(app).get('/api/v1/tasks/999999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('fetches a single task by its on-chain id', async () => {
    await seedTask({ onChainId: 42 });
    const res = await request(app).get('/api/v1/tasks/42');

    expect(res.status).toBe(200);
    expect(res.body.data.onChainId).toBe(42);
  });

  test('rejects a task record creation request without auth', async () => {
    const res = await request(app).post('/api/v1/tasks').send({ title: 'Too short' });
    // No auth header -> should fail auth before validation even runs
    expect(res.status).toBe(401);
  });
});
