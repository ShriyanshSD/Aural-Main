import type { IncomingMessage, ServerResponse } from 'node:http'
import { sessionHandler } from '../../auth-handler.js'

type AuthRequest = IncomingMessage & { body?: unknown }

export default function handler(req: AuthRequest, res: ServerResponse) {
  return sessionHandler(req, res)
}
