const server = require('../dist');
const supertest = require('supertest');

const { default: { app, db } } = server;

afterEach(() => db.clear());

describe('POST /api/initialize', () => {
  test('initializes vault', async () => {
    await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200)
      .then((response) => {
        expect(response.body.accessCardId).toBeDefined();
        expect(response.body.accessCardSecret).toBeDefined();
      });
  });

  test('cannot initialize vault twice', async () => {
    await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(400);
  });

  test('cannot initialize vault with 4 digit pin', async () => {
    await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '0000' })
      .expect(400);
  });
});

describe('POST /api/authenticate', () => {
  test('authenticates with vault', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body })
      .expect(200)
      .then((response) => {
        expect(response.body.tokenId).toBeDefined();
        expect(response.body.tokenAccessSecret).toBeDefined();
      });
  });

  test('fails to authenticate with vault', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000001', ...init.body })
      .expect(401)
      .then((response) => {
        expect(response.body.error).toBeDefined();
      });

    await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body, accessCardId: '1' })
      .expect(401)
      .then((response) => {
        expect(response.body.error).toBeDefined();
      });

    await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body, accessCardSecret: '1' })
      .expect(401)
      .then((response) => {
        expect(response.body.error).toBeDefined();
      });
  });
});
