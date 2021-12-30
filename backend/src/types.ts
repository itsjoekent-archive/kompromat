import type { Request, Response } from 'express';
import type { LevelUp } from 'levelup';
import type { BaseLogger } from 'pino';

export interface AccessCard {
  id: string;
  name: string;
  secret: string;
  vaults: string[];
  createdAt: number;
}

export interface RouteHandlerPlugins {
  logger: BaseLogger,
  db: LevelUp,
};

export type RequestHandler = (request: Request, response: Response) => void;

export type RequestHandlerFactory = (plugins: RouteHandlerPlugins) => RequestHandler;

export interface Token {
  value: string;
  expiresAt: number;
  createdBy: string;
}
