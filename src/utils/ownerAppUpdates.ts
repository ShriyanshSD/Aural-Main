import { isOwnerNativeBuild, ownerApiBaseUrl } from './ownerApi'

interface OwnerUpdateManifest {
  version: string
  webVersion: string
  publishedAt: string
  entry: string
  assets: string
}

const manifestUrl = isOwnerNativeBuild
  ? `${ownerApiBaseUrl}/owner-app/update.json`
  : '/owner-app/update.json'
const cachedManifestKey = 'aurel_owner_web_update_version'

const readManifest = async (): Promise<OwnerUpdateManifest> => {
  const response = await fetch(`${manifestUrl}?t=${Date.now()}`, {
    cache: 'no-store',
    credentials: 'omit',
  })
  if (!response.ok) throw new Error(`Update check failed with status ${response.status}.`)
  const manifest = await response.json() as Partial<OwnerUpdateManifest>
  if (!manifest.webVersion || !manifest.version) {
    throw new Error('The app update service returned an invalid response.')
  }
  return manifest as OwnerUpdateManifest
}

export const checkForOwnerAppUpdate = async (
  reloadIfChanged = true,
): Promise<{ changed: boolean; manifest: OwnerUpdateManifest }> => {
  const manifest = await readManifest()
  const cachedVersion = window.localStorage.getItem(cachedManifestKey)
  const changed = Boolean(cachedVersion && cachedVersion !== manifest.webVersion)

  if (changed) {
    if (reloadIfChanged) {
      window.localStorage.setItem(cachedManifestKey, manifest.webVersion)
      const nextEntry = manifest.entry || '/owner-app/'
      window.location.replace(nextEntry)
      return { changed: true, manifest }
    }
  } else if (!cachedVersion) {
    window.localStorage.setItem(cachedManifestKey, manifest.webVersion)
  }

  return { changed, manifest }
}

export const rememberOwnerAppUpdateBaseline = async (): Promise<OwnerUpdateManifest> => {
  const manifest = await readManifest()
  if (!window.localStorage.getItem(cachedManifestKey)) {
    window.localStorage.setItem(cachedManifestKey, manifest.webVersion)
  }
  return manifest
}
