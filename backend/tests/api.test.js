const server = require('../dist');
const supertest = require('supertest');

const { default: { app, db } } = server;

afterEach(() => db.clear());

describe('POST /api/access-card', () => {
  test('Creates new access card', async () => {
    await supertest(app)
      .post('/api/access-card')
      .send({ name: 'test' })
      .expect(200)
      .then((response) => {
        expect(response.body.id).toBeDefined();
        expect(response.body.secret).toBeDefined();
        expect(response.body.createdAt).toBeDefined();
        expect(response.body.name).toEqual('test');
      });
  });
});

describe('POST /api/authenticate', () => {
  test('Creates authentication token', async () => {
    const accessCardResponse = await supertest(app)
      .post('/api/access-card')
      .send({ name: 'test' })
      .expect(200);

    const authenticateResponse = await supertest(app)
      .post('/api/authenticate')
      .send({
        accessCardId: accessCardResponse.body.id,
        accessCardSecret: accessCardResponse.body.secret,
      })
      .expect(200)
      .then((response) => {
        expect(response.body.token).toBeDefined();
        return response;
      });
  });
});
