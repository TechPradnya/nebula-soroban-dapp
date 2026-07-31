const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('Auth API', () => {
  const credentials = {
    displayName: 'Ada Lovelace',
    email: 'ada@nebula.dev',
    password: 'super-secret-1',
    role: 'freelancer',
  };

  test('registers a new user and returns a JWT', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(credentials.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test('rejects duplicate registration for the same email', async () => {
    await request(app).post('/api/v1/auth/register').send(credentials);
    const res = await request(app).post('/api/v1/auth/register').send(credentials);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('rejects registration with a short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...credentials, email: 'short@nebula.dev', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  test('logs in with correct credentials and rejects wrong ones', async () => {
    await request(app).post('/api/v1/auth/register').send(credentials);

    const good = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(good.status).toBe(200);
    expect(good.body.data.token).toBeDefined();

    const bad = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  test('rejects /me without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns the current user profile with a valid token', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(credentials);
    const { token } = register.body.data;

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(credentials.email);
  });
});
