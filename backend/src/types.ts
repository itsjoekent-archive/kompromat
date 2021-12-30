import type { Request, Response } from 'express';
import type { LevelUp } from 'levelup';
import type { BaseLogger } from 'pino';

export interface AccessCard {
  id: string;
  secret: string;
}

export enum RiskLevel {
  GREEN = 1,
  YELLOW = 2,
  RED = 3,
}

export interface Device {
  id: string;
  name: string;
  secret: string;
  risk: RiskLevel;
  createdAt: number;
}

export interface RouteHandlerPlugins {
  logger: BaseLogger,
  db: LevelUp,
};

export type RequestHandler = (request: Request, response: Response) => void;

export type RequestHandlerFactory = (plugins: RouteHandlerPlugins) => RequestHandler;
