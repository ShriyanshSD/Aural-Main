import { getAppCheck } from 'firebase-admin/app-check'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import type { IncomingMessage } from 'node:http'

const firebaseProjectId = 'aurel-bb325'
const ownerFirebaseAppId = '1:363620614384:android:59be827babf6c3b924c235'
const appName = 'aurel-owner-app-check'

interface FirebaseServiceAccount {
  project_id?: unknown
  client_email?: unknown
  private_key?: unknown
}

const getOwnerAppCheck = () => {
  const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!credentialsJson) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required to verify owner app attestation.')

  const credentials = JSON.parse(credentialsJson) as FirebaseServiceAccount
  if (credentials.project_id !== firebaseProjectId
    || typeof credentials.client_email !== 'string'
    || typeof credentials.private_key !== 'string'
    || !credentials.client_email
    || !credentials.private_key.includes('PRIVATE KEY')) {
    throw new Error('Firebase service account configuration is invalid for the owner app project.')
  }

  const app = getApps().find(existingApp => existingApp.name === appName)
    ?? initializeApp({
      credential: cert({
        projectId: firebaseProjectId,
        clientEmail: credentials.client_email,
        privateKey: credentials.private_key.replace(/\\n/g, '\n'),
      }),
      projectId: firebaseProjectId,
    }, appName)
  return getAppCheck(app)
}

export const verifyOwnerAppCheck = async (req: IncomingMessage): Promise<boolean> => {
  if (process.env.NODE_ENV === 'test') return true

  const token = req.headers['x-firebase-appcheck']
  if (typeof token !== 'string' || token.length === 0 || token.length > 10_000) return false

  try {
    const verifiedToken = await getOwnerAppCheck().verifyToken(token)
    return verifiedToken.appId === ownerFirebaseAppId
  } catch (error) {
    console.warn('Owner Firebase App Check verification failed.', error)
    return false
  }
}
