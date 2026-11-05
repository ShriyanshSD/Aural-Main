import {Capacitor} from '@capacitor/core';
import {SecureStorage} from '@aparajita/capacitor-secure-storage';
import {isOwnerNativeBuild, ownerApiUrl} from './ownerApi';

interface NativeOwnerSession {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  user: {id: string; email: string};
}

const storageKey = 'owner_native_session';
const nativeSessionUnavailableMessage =
  'Native owner sign-in requires the AUREL Owner Android app and Android Keystore storage.';
const isNativeOwnerApp = isOwnerNativeBuild && Capacitor.isNativePlatform();

const isNativeOwnerSession = (value: unknown): value is NativeOwnerSession =>
  Boolean(value && typeof value === 'object'
    && 'accessToken' in value && typeof value.accessToken === 'string'
    && 'refreshToken' in value && typeof value.refreshToken === 'string'
    && 'accessExpiresAt' in value && typeof value.accessExpiresAt === 'string'
    && 'refreshExpiresAt' in value && typeof value.refreshExpiresAt === 'string'
    && 'user' in value && value.user && typeof value.user === 'object'
    && 'id' in value.user && typeof value.user.id === 'string'
    && 'email' in value.user && typeof value.user.email === 'string');

const parseResponse = async <T,>(response: Response): Promise<T> => {
  let payload: ({error?: string} & T);
  try {
    payload = await response.json() as {error?: string} & T;
  } catch {
    throw new Error(`The owner service returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(payload.error || `The request failed (HTTP ${response.status}).`);
  return payload;
};

const readSession = async (): Promise<NativeOwnerSession | null> => {
  const stored = await SecureStorage.get(storageKey);
  if (stored === null) return null;
  if (isNativeOwnerSession(stored)) return stored;
  await SecureStorage.remove(storageKey);
  throw new Error('The saved owner session is invalid. Sign in again.');
};

const saveSession = async (session: NativeOwnerSession): Promise<void> => {
  await SecureStorage.set(storageKey, {...session});
};

const revokeNativeSession = async (refreshToken: string): Promise<void> => {
  const response = await fetch(ownerApiUrl('/api/admin/native/logout'), {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({refreshToken}),
  });
  await parseResponse<{success: true}>(response);
};

const performRefreshSession = async (session: NativeOwnerSession): Promise<NativeOwnerSession> => {
  const response = await fetch(ownerApiUrl('/api/admin/native/refresh'), {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({refreshToken: session.refreshToken}),
  });
  if (response.status === 401 || response.status === 403) {
    await SecureStorage.remove(storageKey);
    throw new Error('Your owner session has expired. Sign in again.');
  }
  const refreshed = await parseResponse<Omit<NativeOwnerSession, 'user'> & {user: NativeOwnerSession['user']}>(response);
  const nextSession: NativeOwnerSession = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    accessExpiresAt: refreshed.accessExpiresAt,
    refreshExpiresAt: refreshed.refreshExpiresAt,
    user: refreshed.user,
  };
  await saveSession(nextSession);
  return nextSession;
};

let refreshInProgress: Promise<NativeOwnerSession> | undefined;

const refreshSession = (session: NativeOwnerSession): Promise<NativeOwnerSession> => {
  if (!refreshInProgress) {
    refreshInProgress = performRefreshSession(session).finally(() => {
      refreshInProgress = undefined;
    });
  }
  return refreshInProgress;
};

export interface OwnerAuthAdapter {
  readonly available: boolean;
  readonly unavailableMessage: string | null;
  assertAvailable(): void;
  login(email: string, password: string): Promise<{user: NativeOwnerSession['user']}>;
  logout(): Promise<void>;
  fetch(path: string, init?: RequestInit): Promise<Response>;
}

export const ownerAuthAdapter: OwnerAuthAdapter = {
  available: !isOwnerNativeBuild || isNativeOwnerApp,
  unavailableMessage: isOwnerNativeBuild && !isNativeOwnerApp ? nativeSessionUnavailableMessage : null,
  assertAvailable() {
    if (isOwnerNativeBuild && !isNativeOwnerApp) throw new Error(nativeSessionUnavailableMessage);
  },
  async login(email, password) {
    this.assertAvailable();
    if (!isOwnerNativeBuild) throw new Error('Native owner sign-in is only available in the AUREL Owner app.');
    const response = await fetch(ownerApiUrl('/api/admin/native/login'), {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password}),
    });
    const session = await parseResponse<NativeOwnerSession>(response);
    try {
      await saveSession(session);
    } catch (storageError) {
      try {
        await revokeNativeSession(session.refreshToken);
      } catch (revokeError) {
        console.error('Unable to revoke the native session after secure storage failed.', revokeError);
      }
      throw storageError;
    }
    return {user: session.user};
  },
  async logout() {
    this.assertAvailable();
    if (!isOwnerNativeBuild) throw new Error('Use website sign-out for the website owner session.');
    const session = await readSession();
    if (session) await revokeNativeSession(session.refreshToken);
    await SecureStorage.remove(storageKey);
  },
  async fetch(path, init = {}) {
    this.assertAvailable();
    if (!isOwnerNativeBuild) {
      return fetch(path, {...init, credentials: 'same-origin', cache: 'no-store'});
    }

    const session = await readSession();
    const headers = new Headers(init.headers);
    if (session) headers.set('Authorization', `Bearer ${session.accessToken}`);
    const request = () => fetch(path, {
      ...init,
      credentials: 'omit',
      cache: 'no-store',
      headers,
    });
    let response = await request();
    if (!session || response.status !== 401
      || path.endsWith('/native/login')
      || path.endsWith('/native/refresh')
      || path.endsWith('/native/logout')) {
      return response;
    }

    const refreshed = await refreshSession(session);
    headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
    response = await request();
    return response;
  },
};
