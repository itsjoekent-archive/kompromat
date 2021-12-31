const server = require('../dist');
const supertest = require('supertest');

const { default: { app, db } } = server;

afterEach(() => db.clear());

describe('Initialization', () => {
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

describe('Authentication', () => {
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

describe('Documents', () => {
  test('Creates document', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    const token = await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body })
      .expect(200);

    await supertest(app)
      .post('/api/document')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', fields: [{ id: '1', type: 'NOTE', value: 'test' }] })
      .expect(200)
      .then((response) => {
        expect(response.body.id).toBeDefined();
        expect(response.body.fields[0]).toBeDefined();
      });
  });

  test('Retrieves documents', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    const token = await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body })
      .expect(200);

    for (let i = 0; i < 10; i++) {
      await supertest(app)
        .post('/api/document')
        .set({
          'x-kompromat-token-id': token.body.tokenId,
          'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
        })
        .send({ name: 'test', fields: [{ id: i, type: 'NOTE', value: 'test' }] })
        .expect(200);
    }

    await supertest(app)
      .get('/api/documents')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200)
      .then((response) => {
        expect(response.body.documents).toBeDefined();
        expect(response.body.documents[0]).toBeDefined();
        expect(response.body.documents[0].id).toBeDefined();
        expect(response.body.documents[0].fields[0].id).toBeDefined();
      });
  });
});
