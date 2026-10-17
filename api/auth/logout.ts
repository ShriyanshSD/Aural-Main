import type { IncomingMessage, ServerResponse } from 'node:http'
import { logoutHandler } from '../../auth-handler.js'

type AuthRequest = IncomingMessage & { body?: unknown }

export default function handler(req: AuthRequest, res: ServerResponse) {
  return logoutHandler(req, res)
}
