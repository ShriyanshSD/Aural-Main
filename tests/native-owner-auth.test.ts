import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer, request, type IncomingMessage, type Server } from 'node:http'
import { after, before, beforeEach, test } from 'node:test'
import apiHandler from '../api/index'

const ownerEmail = 'owner@example.test'
const nativeOrigin = 'https://localhost'
const ownerId = 'a4d76f21-50f2-4c8f-bb6d-a41060a08068'

interface StoredNativeSession {
  id: string
  user_id: string
  access_token_hash: string
  refresh_token_hash: string
  access_expires_at: string
  refresh_expires_at: string
  supabase_access_token: string
  supabase_refresh_token: string
  supabase_expires_at: string
}

interface NativeAuthResponse {
  accessToken: string
  refreshToken: string
  accessExpiresAt: string
  refreshExpiresAt: string
  user: {id: string; email: string}
}

interface TestIncomingMessage extends IncomingMessage {
  body?: unknown
  query?: Record<string, string | string[]>
}

interface StoredPushDevice {
  user_id: string
  owner_email: string
  token: string
  token_hash: string
  platform: string
  enabled: boolean
}

let server: Server
let serverOrigin: string
let sessions: StoredNativeSession[] = []
let pushDevices: StoredPushDevice[] = []
let userEmail = ownerEmail
let emailConfirmedAt: string | null = new Date().toISOString()
let nextSessionId = 0
const originalFetch = globalThis.fetch
const originalFirebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {'Content-Type': 'application/json'},
  })

const mockSupabaseFetch: typeof fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = init?.method ?? 'GET'

  if (url.pathname === '/auth/v1/token') {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
    if (url.searchParams.get('grant_type') === 'password') {
      if (body.email !== ownerEmail || body.password !== 'GoodPassword1') {
        return jsonResponse({message: 'Invalid login credentials'}, 400)
      }
      return jsonResponse({
        access_token: 'supabase-access-token',
        refresh_token: 'supabase-refresh-token',
        expires_in: 3600,
        user: {id: ownerId, email: userEmail, email_confirmed_at: emailConfirmedAt},
      })
    }
    if (url.searchParams.get('grant_type') === 'refresh_token') {
      return jsonResponse({
        access_token: 'supabase-refreshed-access-token',
        refresh_token: 'supabase-refreshed-refresh-token',
        expires_in: 3600,
      })
    }
  }

  if (url.pathname === '/auth/v1/user') {
    const authorization = new Headers(init?.headers).get('Authorization')
    if (!authorization?.startsWith('Bearer supabase-')) return jsonResponse({message: 'Unauthorized'}, 401)
    return jsonResponse({id: ownerId, email: userEmail, email_confirmed_at: emailConfirmedAt})
  }

  if (url.pathname === '/rest/v1/aurel_native_admin_sessions') {
    if (method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as Omit<StoredNativeSession, 'id'>
      sessions.push({...body, id: `session-${++nextSessionId}`})
      return new Response(null, {status: 201})
    }

    const accessHash = url.searchParams.get('access_token_hash')?.slice(3)
    const refreshHash = url.searchParams.get('refresh_token_hash')?.slice(3)
    const id = url.searchParams.get('id')?.slice(3)
    const matches = sessions.filter(session =>
      (!accessHash || session.access_token_hash === accessHash)
      && (!refreshHash || session.refresh_token_hash === refreshHash)
      && (!id || session.id === id))

    if (method === 'GET') return jsonResponse(matches)
    if (method === 'PATCH') {
      const update = JSON.parse(String(init?.body ?? '{}')) as Partial<StoredNativeSession>
      for (const session of matches) Object.assign(session, update)
      return jsonResponse(url.searchParams.has('id') ? matches : matches)
    }
    if (method === 'DELETE') {
      sessions = sessions.filter(session => !matches.includes(session))
      return new Response(null, {status: 204})
    }
  }

  if (url.pathname === '/rest/v1/aurel_owner_push_devices') {
    if (method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as StoredPushDevice
      pushDevices = [...pushDevices.filter(device => device.token_hash !== body.token_hash), body]
      return new Response(null, {status: 201})
    }
    if (method === 'DELETE') {
      const tokenHash = url.searchParams.get('token_hash')?.slice(3)
      const userId = url.searchParams.get('user_id')?.slice(3)
      pushDevices = pushDevices.filter(device =>
        (tokenHash && device.token_hash !== tokenHash)
        || (userId && device.user_id !== userId))
      return new Response(null, {status: 204})
    }
  }

  return jsonResponse({message: `Unexpected test request: ${method} ${url.pathname}`}, 500)
}

const requestJson = async <T,>(
  path: string,
  options: {
    method?: string
    origin?: string
    token?: string
    body?: unknown
    preflightMethod?: string
    preflightHeaders?: string
  } = {},
): Promise<{status: number; body: T; headers: IncomingMessage['headers']}> => new Promise((resolve, reject) => {
  const body = options.body === undefined ? undefined : JSON.stringify(options.body)
  const headers: Record<string, string> = {'Origin': options.origin ?? nativeOrigin}
  if (body) headers['Content-Type'] = 'application/json'
  if (body) headers['Content-Length'] = String(Buffer.byteLength(body))
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.preflightMethod) headers['Access-Control-Request-Method'] = options.preflightMethod
  if (options.preflightHeaders) headers['Access-Control-Request-Headers'] = options.preflightHeaders
  const parsedOrigin = new URL(serverOrigin)
  const outgoing = request({
    hostname: parsedOrigin.hostname,
    port: parsedOrigin.port,
    path: `/api/index?route=${path}`,
    method: options.method ?? 'GET',
    headers,
  }, response => {
    let responseBody = ''
    response.setEncoding('utf8')
    response.on('data', chunk => { responseBody += chunk })
    response.on('end', () => {
      try {
        resolve({
          status: response.statusCode ?? 0,
          body: responseBody ? JSON.parse(responseBody) as T : {} as T,
          headers: response.headers,
        })
      } catch (error) {
        reject(error)
      }
    })
  })
  outgoing.on('error', reject)
  if (body) outgoing.write(body)
  outgoing.end()
})

before(async () => {
  process.env.SUPABASE_URL = 'https://supabase.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'unit-test-placeholder'
  process.env.ADMIN_EMAILS = ownerEmail
  process.env.OWNER_NATIVE_ORIGINS = nativeOrigin
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  globalThis.fetch = mockSupabaseFetch

  server = createServer((requestMessage, response) => {
    let requestBody = ''
    requestMessage.setEncoding('utf8')
    requestMessage.on('data', chunk => { requestBody += chunk })
    requestMessage.on('end', () => {
      const req = requestMessage as TestIncomingMessage
      if (requestBody) req.body = JSON.parse(requestBody) as unknown
      const rewrittenRoute = new URL(req.url ?? '/', 'http://localhost').searchParams.get('route')
      req.query = rewrittenRoute ? {route: rewrittenRoute} : {}
      void apiHandler(req, response)
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  serverOrigin = `http://127.0.0.1:${address.port}`
})

beforeEach(() => {
  sessions = []
  pushDevices = []
  userEmail = ownerEmail
  emailConfirmedAt = new Date().toISOString()
  nextSessionId = 0
})

after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  globalThis.fetch = originalFetch
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.ADMIN_EMAILS
  delete process.env.OWNER_NATIVE_ORIGINS
  if (originalFirebaseServiceAccount === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = originalFirebaseServiceAccount
})

test('rejects invalid credentials and origins', async () => {
  const invalidCredentials = await requestJson<{error: string}>('/api/admin/native/login', {
    method: 'POST',
    body: {email: ownerEmail, password: 'wrong-password'},
  })
  assert.equal(invalidCredentials.status, 401)

  const invalidOrigin = await requestJson<{error: string}>('/api/admin/native/login', {
    method: 'POST',
    origin: 'https://untrusted.example',
    body: {email: ownerEmail, password: 'GoodPassword1'},
  })
  assert.equal(invalidOrigin.status, 403)
  assert.equal(sessions.length, 0)
})

test('matches Vercel native rewrites and handles unauthenticated preflight before owner auth', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8')) as {
    rewrites: Array<{source: string; destination: string}>
  }
  const nativeRoutes = [
    '/api/admin/native/login',
    '/api/admin/native/refresh',
    '/api/admin/native/logout',
  ]
  const adminCatchAllIndex = config.rewrites.findIndex(rewrite => rewrite.source === '/api/admin/:path*')
  assert.notEqual(adminCatchAllIndex, -1)
  for (const route of nativeRoutes) {
    const rewriteIndex = config.rewrites.findIndex(rewrite => rewrite.source === route)
    assert.notEqual(rewriteIndex, -1, `Missing explicit Vercel rewrite for ${route}`)
    assert.ok(rewriteIndex < adminCatchAllIndex, `${route} must precede the admin catch-all rewrite`)
    assert.equal(
      config.rewrites[rewriteIndex].destination,
      `/api/index?route=${route}`,
    )
  }

  const preflight = await requestJson<Record<string, never>>('/api/admin/native/login', {
    method: 'OPTIONS',
    preflightMethod: 'POST',
    preflightHeaders: 'authorization,content-type',
  })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers['access-control-allow-origin'], nativeOrigin)
  assert.match(String(preflight.headers['access-control-allow-methods']), /POST/)
  assert.match(String(preflight.headers['access-control-allow-headers']), /Authorization/i)

  const login = await requestJson<{error: string}>('/api/admin/native/login', {
    method: 'POST',
    body: {email: ownerEmail, password: 'wrong-password'},
  })
  assert.equal(login.status, 401)
  assert.equal(login.body.error, 'Unable to sign in with those owner credentials.')
  assert.notEqual(login.body.error, 'Owner sign-in required.')
  assert.equal(login.headers['access-control-allow-origin'], nativeOrigin)
})

test('rejects unverified and non-allowlisted owner accounts', async () => {
  emailConfirmedAt = null
  const unverified = await requestJson<{error: string}>('/api/admin/native/login', {
    method: 'POST',
    body: {email: ownerEmail, password: 'GoodPassword1'},
  })
  assert.equal(unverified.status, 403)
  assert.equal(sessions.length, 0)

  const notAllowlisted = await requestJson<{error: string}>('/api/admin/native/login', {
    method: 'POST',
    body: {email: 'other@example.test', password: 'GoodPassword1'},
  })
  assert.equal(notAllowlisted.status, 401)
})

test('registers and removes push devices only for an authenticated native owner', async () => {
  const unauthenticated = await requestJson<{error: string}>('/api/admin/notifications/device', {
    method: 'POST',
    body: {token: 'f'.repeat(80)},
  })
  assert.equal(unauthenticated.status, 401)

  const login = await requestJson<NativeAuthResponse>('/api/admin/native/login', {
    method: 'POST',
    body: {email: ownerEmail, password: 'GoodPassword1'},
  })
  assert.equal(login.status, 200)

  const token = 'device-registration-token'.repeat(4)
  const registered = await requestJson<{success: boolean; deliveryConfigured: boolean}>('/api/admin/notifications/device', {
    method: 'POST',
    token: login.body.accessToken,
    body: {token},
  })
  assert.equal(registered.status, 200)
  assert.equal(registered.body.success, true)
  assert.equal(registered.body.deliveryConfigured, false)
  assert.equal(pushDevices.length, 1)
  assert.equal(pushDevices[0].user_id, ownerId)
  assert.equal(pushDevices[0].owner_email, ownerEmail)
  assert.notEqual(pushDevices[0].token_hash, token)

  const removed = await requestJson<{success: boolean}>('/api/admin/notifications/device', {
    method: 'DELETE',
    token: login.body.accessToken,
    body: {token},
  })
  assert.equal(removed.status, 200)
  assert.equal(removed.body.success, true)
  assert.equal(pushDevices.length, 0)
})

test('issues protected native sessions, rotates refresh tokens, and revokes on logout', async () => {
  const unauthenticated = await requestJson<{error: string}>('/api/admin/orders')
  assert.equal(unauthenticated.status, 401)

  const login = await requestJson<NativeAuthResponse>('/api/admin/native/login', {
    method: 'POST',
    body: {email: ownerEmail, password: 'GoodPassword1'},
  })
  assert.equal(login.status, 200)
  assert.equal(login.body.user.email, ownerEmail)
  assert.equal(sessions.length, 1)

  const ownerApi = await requestJson<{user: {id: string}}>('/api/admin/me', {token: login.body.accessToken})
  assert.equal(ownerApi.status, 200)
  assert.equal(ownerApi.body.user.id, ownerId)

  const refreshed = await requestJson<NativeAuthResponse>('/api/admin/native/refresh', {
    method: 'POST',
    body: {refreshToken: login.body.refreshToken},
  })
  assert.equal(refreshed.status, 200)
  assert.notEqual(refreshed.body.accessToken, login.body.accessToken)
  assert.notEqual(refreshed.body.refreshToken, login.body.refreshToken)

  const oldAccessToken = await requestJson<{error: string}>('/api/admin/me', {token: login.body.accessToken})
  assert.equal(oldAccessToken.status, 401)
  const refreshedOwnerApi = await requestJson<{user: {id: string}}>('/api/admin/me', {token: refreshed.body.accessToken})
  assert.equal(refreshedOwnerApi.status, 200)

  const logout = await requestJson<{success: boolean}>('/api/admin/native/logout', {
    method: 'POST',
    body: {refreshToken: refreshed.body.refreshToken},
  })
  assert.equal(logout.status, 200)
  assert.equal(logout.body.success, true)
  assert.equal(sessions.length, 0)

  const revokedAccess = await requestJson<{error: string}>('/api/admin/me', {token: refreshed.body.accessToken})
  assert.equal(revokedAccess.status, 401)
})
