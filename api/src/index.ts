import path from 'path';

import cors from 'cors';
import express, { Request, Response } from 'express';
import ms from 'ms';
import pino from 'pino';
import pinoHttp from 'pino-http';

import db from './db';
import firewall from './firewall';
import reaper from './reaper';
import { RequestHandlerFactory } from './types';
import archiveDocument from './routes/archive-document';
import authenticate from './routes/authenticate';
import createAccessCard from './routes/create-access-card';
import createDocument from './routes/create-document';
import deleteDocument from './routes/delete-document';
import getAccessCards from './routes/get-access-cards';
import getArchivedDocuments from './routes/get-archived-documents';
import getDocuments from './routes/get-documents';
import initializeVault from './routes/initialize-vault';
import restoreDocument from './routes/restore-document';
import revokeAccessCard from './routes/revoke-access-card';
import updateAccessCard from './routes/update-access-card';
import updateDocument from './routes/update-document';

const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body',
    ],
  },
});

const app = express();

if (!process.env.TEST) {
  // TODO: strip sensitive info from logs
  app.use(pinoHttp({ logger }));
}

app.use(cors());
app.use(express.json());

const apiRouter = express.Router();

const routes: {
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  handler: RequestHandlerFactory,
}[] = [
  { method: 'get', path: '/access-cards', handler: getAccessCards },
  { method: 'post', path: '/access-cards', handler: createAccessCard },
  { method: 'put', path: '/access-cards/:id', handler: updateAccessCard },
  { method: 'post', path: '/access-cards/:id/revoke', handler: revokeAccessCard },
  { method: 'post', path: '/authenticate', handler: authenticate },
  { method: 'get', path: '/documents', handler: getDocuments },
  { method: 'post', path: '/documents', handler: createDocument },
  { method: 'put', path: '/documents/:id', handler: updateDocument },
  { method: 'delete', path: '/documents/:id', handler: deleteDocument },
  { method: 'post', path: '/documents/:id/archive', handler: archiveDocument },
  { method: 'post', path: '/documents/:id/restore', handler: restoreDocument },
  { method: 'get', path: '/documents/archived', handler: getArchivedDocuments },
  { method: 'post', path: '/vault/initialize', handler: initializeVault },
];

routes.forEach((route) => {
  apiRouter[route.method](
    route.path,
    async function wrapper(request: Request, response: Response) {
      try {
        await route.handler({ logger, db, firewall })(request, response);
      } catch (error: any) {
        if (process.env.TEST) {
          logger.error(error?.stack || error);
        } else {
          logger.error(error?.message);
        }

        response.status(500).json({ error: 'Encountered unexpected server error' });
      }
    },
  );
});

apiRouter.use('*', (request: Request, response: Response) =>
  response.status(404).json({ error: 'not found' }));

app.use('/api', apiRouter);

// http://expressjs.com/en/resources/middleware/serve-static.html
// function setCustomCacheControl (res, path) {
//   if (serveStatic.mime.lookup(path) === 'text/html') {
//     // Custom Cache-Control for HTML files
//     res.setHeader('Cache-Control', 'public, max-age=0')
//   }
// }
app.use('*', express.static('public', {
  index: true,
}));

if (!process.env.TEST) {
  const PORT = process.env.PORT;
  app.listen(PORT, () => logger.info(`Kompromat is listening on PORT:${PORT}`));

  setInterval(() => reaper({ logger, db }), ms('5 minutes'));
}

export default { app, db, firewall };
