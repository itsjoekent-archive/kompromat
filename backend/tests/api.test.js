const server = require('../dist');
const supertest = require('supertest');

const { default: { app, db, firewall } } = server;

afterEach(async () => {
  await db.clear();
  firewall.reset();
});

async function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

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
  test('Authenticates with vault', async () => {
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

  test.only('ip gets blocked', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    for (let index = 0; index <= 6; index++) {
      await supertest(app)
        .post('/api/authenticate')
        .set('X-Forwarded-For', '192.168.1.1')
        .send({ pin: '000001', ...init.body })
    }

    await supertest(app)
      .post('/api/authenticate')
      .set('X-Forwarded-For', '192.168.1.1')
      .send({ pin: '000000', ...init.body })
      .expect(401);

    const token = await supertest(app)
      .post('/api/authenticate')
      .set('X-Forwarded-For', '192.168.1.2')
      .send({ pin: '000000', ...init.body })
      .expect(200);

    const accessCard = await supertest(app)
      .post('/api/access-cards')
      .set('X-Forwarded-For', '192.168.1.1')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', pin: '000000' })
      .expect(401);
  });
});

describe('Access Cards', () => {
  test('Creates and renames an access card', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    const token = await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body })
      .expect(200);

    await supertest(app)
      .post('/api/access-cards')
      .set({
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .send({ name: 'test', pin: '000000' })
      .expect(401);

    const accessCard = await supertest(app)
      .post('/api/access-cards')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', pin: '000000' })
      .expect(200)
      .then((response) => {
        expect(response.body.accessCard.id).toBeDefined();
        expect(response.body.accessCard.name).toEqual('test');
        expect(response.body.accessCard.secret).toBeDefined();
        expect(response.body.accessCard.key).not.toBeDefined();

        return response.body.accessCard;
      });

    await supertest(app)
      .put(`/api/access-cards/${accessCard.id}`)
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test 2' })
      .expect(200)
      .then((response) => {
        expect(response.body.accessCard.id).toBeDefined();
        expect(response.body.accessCard.name).toEqual('test 2');
      });

    await supertest(app)
      .get(`/api/access-cards`)
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200)
      .then((response) => {
        expect(response.body.accessCards[0].id).toBeDefined();
        expect(response.body.accessCards[1].name).toEqual('test 2');
      });

    await supertest(app)
      .put(`/api/access-cards/${accessCard.id}`)
      .set({
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .send({ name: 'test 2' })
      .expect(401);
  });

  test('Fails to create access card without valid pin', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    const token = await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body })
      .expect(200);

    await supertest(app)
      .post('/api/access-cards')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', pin: '1' })
      .expect(400);

    await supertest(app)
      .post('/api/access-cards')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', pin: 'test' })
      .expect(400);
  });

  test('Revokes access card', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    const token = await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body })
      .expect(200);

    const accessCard = await supertest(app)
      .post('/api/access-cards')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', pin: '000000' })
      .expect(200);

    await supertest(app)
      .post(`/api/access-cards/${accessCard.body.accessCard.id}/revoke`)
      .send({ pin: '000000', accessCardSecret: init.body.accessCardSecret })
      .set({
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .expect(401);

    await supertest(app)
      .post(`/api/access-cards/${accessCard.body.accessCard.id}/revoke`)
      .send({ pin: '000000', accessCardSecret: init.body.accessCardSecret })
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200);

    await supertest(app)
      .get(`/api/access-cards`)
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200)
      .then((response) => expect(response.body.accessCards).toHaveLength(1));

    await supertest(app)
      .get(`/api/access-cards`)
      .set({
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .expect(401);

    await supertest(app)
      .post(`/api/access-cards/${init.body.accessCardId}/revoke`)
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(400);
  });

  test('Can\'t revoke access card', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    const token = await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body })
      .expect(200);

    const accessCard = await supertest(app)
      .post('/api/access-cards')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', pin: '000000' })
      .expect(200);

    await supertest(app)
      .post(`/api/access-cards/${accessCard.body.accessCard.id}/revoke`)
      .send({ pin: '000001', accessCardSecret: init.body.accessCardSecret })
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(401);

    await supertest(app)
      .post(`/api/access-cards/${accessCard.body.accessCard.id}/revoke`)
      .send({ pin: '000000', accessCardSecret: accessCard.body.accessCard.secret })
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(401);

    await supertest(app)
      .post(`/api/access-cards/${init.body.accessCardId}/revoke`)
      .send({ pin: '000000', accessCardSecret: init.body.accessCardSecret })
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200);

    await supertest(app)
      .get(`/api/access-cards`)
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(401);
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
      .post('/api/documents')
      .set({
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .send({ name: 'test', fields: [{ id: '1', type: 'NOTE', value: 'test' }] })
      .expect(401);

    const document = await supertest(app)
      .post('/api/documents')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', fields: [{ id: '1', type: 'NOTE', value: 'test' }] })
      .expect(200)
      .then((response) => {
        expect(response.body.document.id).toBeDefined();
        expect(response.body.document.fields[0]).toBeDefined();
        expect(response.body.document.fields[0].value).toEqual('test');
        expect(response.body.document.createdAt).toBeDefined();
        expect(response.body.document.createdAt).toEqual(response.body.document.updatedAt);

        return response.body.document;
      });

    await supertest(app)
      .put(`/api/documents/${document.id}`)
      .set({
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .send({ name: 'test', fields: [{ id: '1', type: 'NOTE', value: 'test 2' }] })
      .expect(401);

    await supertest(app)
      .put(`/api/documents/${document.id}`)
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', fields: [{ id: '1', type: 'NOTE', value: 'test 2' }] })
      .expect(200)
      .then((response) => {
        expect(response.body.document.id).toBeDefined();
        expect(response.body.document.fields[0].value).toEqual('test 2');
        expect(response.body.document.updatedAt).toBeGreaterThan(response.body.document.createdAt);
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
        .post('/api/documents')
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
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .expect(401);

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

  test('Archives a document', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    const token = await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body })
      .expect(200);

    const document = await supertest(app)
      .post('/api/documents')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', fields: [{ id: '1', type: 'NOTE', value: 'test' }] })
      .expect(200)
      .then((response) => response.body.document);

    await supertest(app)
      .post(`/api/documents/${document.id}/archive`)
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200);

    await supertest(app)
      .post(`/api/documents/${document.id}/archive`)
      .set({
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .expect(401);

    await supertest(app)
      .get('/api/documents')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200)
      .then((response) => expect(response.body.documents).toHaveLength(0));

    await supertest(app)
      .get('/api/documents/archived')
      .set({
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .expect(401);

    await supertest(app)
      .get('/api/documents/archived')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200)
      .then((response) => {
        expect(response.body.documents).toHaveLength(1);
        expect(response.body.documents[0].id).toEqual(document.id);
        expect(response.body.documents[0].fields[0].id).toEqual(document.fields[0].id);
      });

    await supertest(app)
      .post(`/api/documents/${document.id}/restore`)
      .set({
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .expect(401);

    await supertest(app)
      .post(`/api/documents/${document.id}/restore`)
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200);

    await supertest(app)
      .get('/api/documents')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200)
      .then((response) => expect(response.body.documents).toHaveLength(1));

    await supertest(app)
      .get('/api/documents/archived')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200)
      .then((response) => expect(response.body.documents).toHaveLength(0));
  });

  test('Deletes a document', async () => {
    const init = await supertest(app)
      .post('/api/vault/initialize')
      .send({ pin: '000000' })
      .expect(200);

    const token = await supertest(app)
      .post('/api/authenticate')
      .send({ pin: '000000', ...init.body })
      .expect(200);

    const document = await supertest(app)
      .post('/api/documents')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .send({ name: 'test', fields: [{ id: '1', type: 'NOTE', value: 'test' }] })
      .expect(200)
      .then((response) => response.body.document);

    await supertest(app)
      .post(`/api/documents/${document.id}/archive`)
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200);

    await supertest(app)
      .delete(`/api/documents/${document.id}`)
      .set({
        'x-kompromat-token-id': 'test',
        'x-kompromat-token-access-secret': 'invalid',
      })
      .expect(401);

    await supertest(app)
      .delete(`/api/documents/${document.id}`)
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200);

    await supertest(app)
      .get('/api/documents')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200)
      .then((response) => expect(response.body.documents).toHaveLength(0));

    await supertest(app)
      .get('/api/documents/archived')
      .set({
        'x-kompromat-token-id': token.body.tokenId,
        'x-kompromat-token-access-secret': token.body.tokenAccessSecret,
      })
      .expect(200)
      .then((response) => expect(response.body.documents).toHaveLength(0));
    });
});
