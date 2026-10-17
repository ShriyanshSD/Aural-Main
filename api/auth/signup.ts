import type { IncomingMessage, ServerResponse } from 'node:http'
import { signupHandler } from '../../auth-handler.js'

type AuthRequest = IncomingMessage & { body?: unknown }

export default function handler(req: AuthRequest, res: ServerResponse) {
  return signupHandler(req, res)
}
