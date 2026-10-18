import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  accountOrdersHandler,
  changePasswordHandler,
  chatHistoryHandler,
  confirmEmailChangeHandler,
  deleteAccountHandler,
  logoutHandler,
  profileHandler,
  requestEmailChangeHandler,
  resendSignupVerificationHandler,
  sessionHandler,
  signupHandler,
  verifySignupHandler,
  loginHandler
} from '../auth-handler.js'
import { chatHandler } from '../chat-handler.js'

type ApiRequest = IncomingMessage & { body?: unknown }
type ApiHandler = (req: ApiRequest, res: ServerResponse) => void | Promise<void>

const routes: Record<string, ApiHandler> = {
  '/api/chat': chatHandler,
  '/api/chat/history': chatHistoryHandler,
  '/api/auth/signup': signupHandler,
  '/api/auth/verify': verifySignupHandler,
  '/api/auth/resend-verification': resendSignupVerificationHandler,
  '/api/auth/login': loginHandler,
  '/api/auth/me': sessionHandler,
  '/api/auth/profile': profileHandler,
  '/api/auth/change-email': requestEmailChangeHandler,
  '/api/auth/orders': accountOrdersHandler,
  '/api/auth/change-password': changePasswordHandler,
  '/api/auth/delete-account': deleteAccountHandler,
  '/api/auth/confirm-email-change': confirmEmailChangeHandler,
  '/api/auth/logout': logoutHandler
}

export default function handler(req: ApiRequest, res: ServerResponse) {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/\/+$/, '') || '/'
  const route = routes[pathname]
  if (!route) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'API route not found.' }))
    return
  }
  return route(req, res)
}
