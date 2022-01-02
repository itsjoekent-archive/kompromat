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

export interface Document {
  id: string;
  name: string;
  fields: DocumentField[];
  createdAt: number;
  updatedAt: number;
}

export enum DocumentFieldType {
  PASSWORD = 'PASSWORD',
  TWO_FACTOR = 'TWO_FACTOR',
  NOTE = 'NOTE',
}

export interface DocumentField {
  id: string;
  type: DocumentFieldType;
  value: string;
}

export interface EncryptedDocument {
  id: string;
  name: string;
  fields: string;
  createdAt: number;
  updatedAt: number;
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
