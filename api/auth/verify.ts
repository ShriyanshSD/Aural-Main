import type { IncomingMessage, ServerResponse } from 'node:http'
import { verifySignupHandler } from '../../auth-handler.js'

type AuthRequest = IncomingMessage & { body?: unknown }

export default function handler(req: AuthRequest, res: ServerResponse) {
  return verifySignupHandler(req, res)
}
