import { promisify } from 'util';
import crypto from 'crypto';

import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { Device, RequestHandler, RiskLevel, RouteHandlerPlugins } from '../types';
import { deviceKey } from '../utils/keys';

const randomBytes = promisify(crypto.randomBytes);

interface DeviceBody {
  name?: string;
}

function createNewDevice(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const { body } = request;
    const { name }: DeviceBody = body;

    if (!name || typeof name !== 'string' || name.length > 64) {
      response.status(400).json({ error: 'Invalid device name' });
      return;
    }

    const id = uuid();
    const newDeviceKey = deviceKey(id);

    try {
      const existing = await plugins.db.get(newDeviceKey);
      if (existing) throw new Error('id in use');
    } catch (error: any) {
      if (!error.notFound) {
        throw error;
      }
    }

    const secretBuffer = await randomBytes(16);
    const secret = secretBuffer.toString('hex');

    const device: Device = {
      id,
      name,
      secret,
      risk: RiskLevel.RED,
      createdAt: Date.now(),
    };

    await plugins.db.put(newDeviceKey, device);

    response.json(device);
  }

  return routeHandler;
}

export default createNewDevice;
