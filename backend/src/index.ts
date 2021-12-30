import path from 'path';

import cors from 'cors';
import express, { Request, Response } from 'express';
import leveldown from 'leveldown';
import levelup from 'levelup';
import memdown from 'memdown';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { RequestHandlerFactory } from './types';
import createNewDevice from './routes/create-new-device';

const logger = pino();

const dbPath = path.join(process.cwd(), 'data');
const db = levelup(process.env.TEST ? memdown() : leveldown(dbPath));

const app = express();

if (!process.env.TEST) {
  app.use(pinoHttp({ logger }));
}

app.use(cors());
app.use(express.json());

const apiRouter = express.Router();

const routes: [
  {
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    handler: RequestHandlerFactory,
  },
] = [
  { method: 'post', path: '/device', handler: createNewDevice },
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
