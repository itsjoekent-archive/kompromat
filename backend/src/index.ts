import path from 'path';

import cors from 'cors';
import express, { Request, Response } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';

import db from './db';
import { RequestHandlerFactory } from './types';
import authenticate from './routes/authenticate';
import createAccessCard from './routes/create-access-card';
import createDocument from './routes/create-document';
import getDocuments from './routes/get-documents';
import initializeVault from './routes/initialize-vault';

const logger = pino();

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
  { method: 'post', path: '/access-card', handler: createAccessCard },
  { method: 'post', path: '/authenticate', handler: authenticate },
  { method: 'get', path: '/documents', handler: getDocuments },
  { method: 'post', path: '/document', handler: createDocument },
  { method: 'post', path: '/vault/initialize', handler: initializeVault },
];

routes.forEach((route) => {
  apiRouter[route.method](
    route.path,
    async function wrapper(request: Request, response: Response) {
      try {
        await route.handler({ logger, db })(request, response);
      } catch (error) {
        logger.error(error);
        response.status(500).json({ error: 'Encountered unexpected server error' });
      }
    },
  );
});

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
  app.listen(PORT, () => logger.info(`M.I.D.N.I.G.H.T. is listening on PORT:${PORT}`));
}

export default { app, db };
