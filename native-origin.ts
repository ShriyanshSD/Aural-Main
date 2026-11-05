import type {IncomingMessage, ServerResponse} from 'node:http';

const defaultNativeOrigins = ['https://localhost'];
const allowedMethods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
const allowedHeaders = new Set(['content-type', 'authorization']);

export const getNativeOrigins = (): Set<string> => {
  const configuredOrigins = process.env.OWNER_NATIVE_ORIGINS
    ?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const origins = configuredOrigins?.length ? configuredOrigins : defaultNativeOrigins;

  return new Set(origins.map(origin => {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error(`Invalid native app origin in OWNER_NATIVE_ORIGINS: ${origin}`);
    }

    if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== origin) {
      throw new Error(`Native app origins must be exact HTTPS origins: ${origin}`);
    }
    return parsedOrigin.origin;
  }));
};

export const isAllowedNativeOrigin = (origin: string): boolean =>
  getNativeOrigins().has(origin);

export const handleNativeCors = (req: IncomingMessage, res: ServerResponse): boolean => {
  const origin = req.headers.origin;
  const isAllowedOrigin = Boolean(origin && isAllowedNativeOrigin(origin));

  if (origin && isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method !== 'OPTIONS') return false;

  if (!isAllowedOrigin || !origin) {
    res.statusCode = 403;
    res.end();
    return true;
  }

  const requestedMethod = req.headers['access-control-request-method']?.toUpperCase();
  const requestedHeaders = (req.headers['access-control-request-headers'] ?? '')
    .split(',')
    .map(header => header.trim().toLowerCase())
    .filter(Boolean);

  if (
    !requestedMethod
    || !allowedMethods.has(requestedMethod)
    || requestedHeaders.some(header => !allowedHeaders.has(header))
  ) {
    res.statusCode = 403;
    res.end();
    return true;
  }

  res.setHeader('Access-Control-Allow-Methods', [...allowedMethods, 'OPTIONS'].join(', '));
  if (requestedHeaders.length) res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
  res.statusCode = 204;
  res.end();
  return true;
};
