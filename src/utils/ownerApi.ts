const ownerApiBaseUrl = (
  import.meta.env.VITE_OWNER_API_BASE_URL || 'https://aural-main.vercel.app'
).replace(/\/+$/, '');

export const isOwnerNativeBuild = import.meta.env.MODE === 'owner';

export const ownerApiUrl = (path: string): string =>
  isOwnerNativeBuild ? `${ownerApiBaseUrl}${path.startsWith('/') ? path : `/${path}`}` : path;

export const ownerAssetUrl = (url: string): string =>
  isOwnerNativeBuild && url.startsWith('/') && !url.startsWith('//')
    ? `${ownerApiBaseUrl}${url}`
    : url;

export const ownerStorefrontUrl = (): string =>
  isOwnerNativeBuild ? `${ownerApiBaseUrl}/` : '/';
