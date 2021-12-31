import type { Request, Response } from 'express';
import type { BaseLogger } from 'pino';
import type { DB } from './db';

export interface AccessCard {
  id: string;
  name: string;
  challenge: string;
  key: string;
  createdAt: number;
}

export interface RouteHandlerPlugins {
  logger: BaseLogger,
  db: DB,
};

export type RequestHandler = (request: Request, response: Response) => void;

export type RequestHandlerFactory = (plugins: RouteHandlerPlugins) => RequestHandler;

export interface Token {
  id: string;
  vaultKey: string;
  challenge: string;
  expiresAt: number;
  createdBy: string;
}
