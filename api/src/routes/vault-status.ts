import { Request, Response } from 'express';
import { RequestHandler, RouteHandlerPlugins } from '../types';
import { HAS_INITIALIZED } from '../utils/keys';

function vaultStatus(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    if (plugins.firewall.isBlocked(request)) {
      response.status(401).json({ error: 'Cannot get vault status' });
      return;
    }

    const hasInitialized = !!(await plugins.db.get(HAS_INITIALIZED));

    response.json({ hasInitialized });
  }

  return routeHandler;
}

export default vaultStatus;
