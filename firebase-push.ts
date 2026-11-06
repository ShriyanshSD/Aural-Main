import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

interface FirebaseServiceAccount {
  project_id?: unknown
  client_email?: unknown
  private_key?: unknown
}

const getFirebaseMessaging = () => {
  const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!credentialsJson) return undefined

  const credentials = JSON.parse(credentialsJson) as FirebaseServiceAccount
  if (typeof credentials.project_id !== 'string'
    || typeof credentials.client_email !== 'string'
    || typeof credentials.private_key !== 'string'
    || !credentials.project_id
    || !credentials.client_email
    || !credentials.private_key.includes('PRIVATE KEY')) {
    throw new Error('Firebase service account configuration is incomplete.')
  }

  const appName = 'aurel-owner-push'
  const existingApp = getApps().find(app => app.name === appName)
  const app = existingApp ?? initializeApp({
    credential: cert({
      projectId: credentials.project_id,
      clientEmail: credentials.client_email,
      privateKey: credentials.private_key.replace(/\\n/g, '\n'),
    }),
    projectId: credentials.project_id,
  }, appName)

  return getMessaging(app)
}

export const sendNewOrderPushNotification = async (
  tokens: string[],
  orderId: string,
): Promise<string[]> => {
  const messaging = getFirebaseMessaging()
  if (!messaging || tokens.length === 0) return []

  const invalidTokens: string[] = []
  for (let offset = 0; offset < tokens.length; offset += 500) {
    const batch = tokens.slice(offset, offset + 500)
    const result = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: {
        title: 'New AUREL order',
        body: 'A new order is waiting for review.',
      },
      data: {
        type: 'new_order',
        orderId,
      },
      android: {
        priority: 'high',
        notification: { channelId: 'aurel-orders' },
      },
    })

    result.responses.forEach((response, index) => {
      if (response.success) return
      const code = response.error?.code
      if (code === 'messaging/registration-token-not-registered'
        || code === 'messaging/invalid-registration-token') {
        invalidTokens.push(batch[index])
      } else {
        console.error('Firebase push delivery failed for a registered device.', code ?? 'unknown')
      }
    })
  }
  return invalidTokens
}
