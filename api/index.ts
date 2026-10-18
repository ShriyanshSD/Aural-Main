import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  accountOrdersHandler,
  changePasswordHandler,
  chatHistoryHandler,
  confirmEmailChangeHandler,
  deleteAccountHandler,
  loginHandler,
  logoutHandler,
  profileHandler,
  requestEmailChangeHandler,
  resendSignupVerificationHandler,
  sessionHandler,
  signupHandler,
  verifySignupHandler
} from '../auth-handler.js'
import { chatHandler } from '../chat-handler.js'
import { indiaCitiesHandler, indiaStatesHandler } from '../locations-handler.js'
import { adminApiHandler, publicCatalogHandler } from '../admin-handler.js'

type ApiRequest = IncomingMessage & {
  body?: unknown
  query?: Record<string, string | string[]>
}
type ApiHandler = (req: ApiRequest, res: ServerResponse) => void | Promise<void>

const routes: Record<string, ApiHandler> = {
  '/api/chat': chatHandler,
  '/api/chat/history': chatHistoryHandler,
  '/api/locations/states': indiaStatesHandler,
  '/api/locations/cities': indiaCitiesHandler,
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
  const rewrittenRoute = req.query?.route
  const requestedRoute = Array.isArray(rewrittenRoute) ? rewrittenRoute[0] : rewrittenRoute
  const pathname = requestedRoute
    ?? new URL(req.url ?? '/', 'http://localhost').searchParams.get('route')
    ?? new URL(req.url ?? '/', 'http://localhost').pathname
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  if (normalizedPath === '/api/catalog') return publicCatalogHandler(req, res)
  if (normalizedPath === '/api/admin' || normalizedPath.startsWith('/api/admin/')) return adminApiHandler(req, res)
  const route = routes[normalizedPath]
  if (!route) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'API route not found.' }))
    return
  }
  return route(req, res)
}
