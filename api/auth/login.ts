import type { IncomingMessage, ServerResponse } from 'node:http'
import { loginHandler } from '../../auth-handler'

type AuthRequest = IncomingMessage & { body?: unknown }

export default function handler(req: AuthRequest, res: ServerResponse) {
  return loginHandler(req, res)
}
