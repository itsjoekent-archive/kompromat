const server = require('../dist');
const supertest = require('supertest');

const { default: { app, db } } = server;

afterEach(() => db.clear());

describe('POST /api/device', () => {
  test('Creates new device', async () => {
    await supertest(app)
      .post('/api/device')
      .send({ name: 'test' })
      .expect(200)
      .then((response) => {
        expect(response.body.id).toBeDefined();
        expect(response.body.secret).toBeDefined();
        expect(response.body.createdAt).toBeDefined();
        expect(response.body.name).toEqual('test');
        expect(response.body.risk).toEqual(3);
      });
  });
});
