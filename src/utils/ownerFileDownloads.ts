import { Capacitor, registerPlugin } from '@capacitor/core'
import { isOwnerNativeBuild } from './ownerApi'

interface OwnerDownloadsPlugin {
  saveToDownloads(options: {
    filename: string
    mimeType: string
    dataBase64: string
  }): Promise<{ uri: string }>
}

const OwnerDownloads = registerPlugin<OwnerDownloadsPlugin>('OwnerDownloads')

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

export const saveOwnerDownload = async (
  blob: Blob,
  filename: string,
  mimeType: string,
): Promise<'device' | 'browser'> => {
  if (isOwnerNativeBuild && Capacitor.getPlatform() === 'android') {
    await OwnerDownloads.saveToDownloads({
      filename,
      mimeType,
      dataBase64: await blobToBase64(blob),
    })
    return 'device'
  }

  const objectUrl = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  }
  return 'browser'
}
