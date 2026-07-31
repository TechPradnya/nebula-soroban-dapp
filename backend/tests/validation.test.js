const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('Hardened validation', () => {
  test('rejects registration with a password that has no digit', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Test User',
      email: 'nodigit@nebula.dev',
      password: 'onlyletters',
    });
    expect(res.status).toBe(400);
    expect(res.body.details.join(' ')).toMatch(/letter and one number/);
  });

  test('rejects registration with a password that has no letter', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Test User',
      email: 'noletter@nebula.dev',
      password: '12345678',
    });
    expect(res.status).toBe(400);
  });

  test('accepts a password with both a letter and a digit', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Test User',
      email: 'valid-pw@nebula.dev',
      password: 'validpass1',
    });
    expect(res.status).toBe(201);
  });

  test('rejects an unknown method on the transaction-build endpoint', async () => {
    const register = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Tx Tester',
      email: 'tx-tester@nebula.dev',
      password: 'validpass1',
    });
    const { token } = register.body.data;

    const res = await request(app)
      .post('/api/v1/transactions/build')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contract: 'marketplace',
        method: 'initialize', // not in the allowlist — admin-only bootstrap call
        args: [],
        argTypes: [],
        sourceAddress: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW',
      });

    expect(res.status).toBe(400);
  });

  test('rejects mismatched args/argTypes lengths on the transaction-build endpoint', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'tx-tester@nebula.dev', password: 'validpass1' });
    const { token } = login.body.data;

    const res = await request(app)
      .post('/api/v1/transactions/build')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contract: 'marketplace',
        method: 'accept_task',
        args: ['GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW'],
        argTypes: ['address', 'u64'],
        sourceAddress: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW',
      });

    expect(res.status).toBe(400);
  });
});
