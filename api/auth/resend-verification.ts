import type { IncomingMessage, ServerResponse } from 'node:http'
import { resendSignupVerificationHandler } from '../../auth-handler'

type AuthRequest = IncomingMessage & { body?: unknown }

export default function handler(req: AuthRequest, res: ServerResponse) {
  return resendSignupVerificationHandler(req, res)
}
