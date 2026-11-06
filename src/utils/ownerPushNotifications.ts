import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { PushNotifications } from '@capacitor/push-notifications'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { ownerAuthAdapter } from './ownerAuthAdapter'
import { isOwnerNativeBuild, ownerApiUrl } from './ownerApi'

const storedPushTokenKey = 'owner_native_push_token'

export interface OwnerPushSetup {
  status: 'enabled' | 'server-not-configured' | 'permission-denied' | 'not-native'
  cleanup: () => void
}

const saveDeviceToken = async (token: string): Promise<boolean> => {
  const response = await ownerAuthAdapter.fetch(ownerApiUrl('/api/admin/notifications/device'), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({token}),
  })
  if (!response.ok) throw new Error('The owner service could not register this device for notifications.')
  const result = await response.json() as {deliveryConfigured?: boolean}
  await SecureStorage.set(storedPushTokenKey, token)
  return result.deliveryConfigured === true
}

export const startOwnerPushNotifications = async (
  onError: (error: Error) => void,
): Promise<OwnerPushSetup> => {
  if (!isOwnerNativeBuild || Capacitor.getPlatform() !== 'android') {
    return {status: 'not-native', cleanup: () => {}}
  }

  let permission = await PushNotifications.checkPermissions()
  if (permission.receive !== 'granted') permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') {
    return {status: 'permission-denied', cleanup: () => {}}
  }

  await LocalNotifications.createChannel({
    id: 'aurel-orders',
    name: 'AUREL owner order alerts',
    description: 'Alerts for new AUREL orders',
    importance: 4,
  })

  let settled = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let resolveRegistration!: (deliveryConfigured: boolean) => void
  let rejectRegistration!: (error: Error) => void
  const registration = new Promise<boolean>((resolve, reject) => {
    resolveRegistration = resolve
    rejectRegistration = reject
  })
  const listeners: PluginListenerHandle[] = []

  listeners.push(await PushNotifications.addListener('registration', ({value}) => {
    void saveDeviceToken(value).then(deliveryConfigured => {
      if (settled) return
      settled = true
      resolveRegistration(deliveryConfigured)
    }).catch(error => {
      const registrationError = error instanceof Error ? error : new Error('Device notification registration failed.')
      if (!settled) {
        settled = true
        rejectRegistration(registrationError)
      } else {
        onError(registrationError)
      }
    })
  }))

  listeners.push(await PushNotifications.addListener('registrationError', error => {
    const registrationError = new Error(error.error || 'Device notification registration failed.')
    if (!settled) {
      settled = true
      rejectRegistration(registrationError)
    } else {
      onError(registrationError)
    }
  }))

  listeners.push(await PushNotifications.addListener('pushNotificationReceived', notification => {
    void LocalNotifications.schedule({
      notifications: [{
        id: Date.now() % 2_147_483_647,
        title: notification.title || 'AUREL owner update',
        body: notification.body || 'You have a new owner notification.',
        channelId: 'aurel-orders',
      }],
    }).catch(onError)
  }))

  try {
    timeoutId = setTimeout(() => {
      if (settled) return
      settled = true
      rejectRegistration(new Error('Firebase did not return a device notification token.'))
    }, 20_000)
    await PushNotifications.register()
    const deliveryConfigured = await registration
    return {
      status: deliveryConfigured ? 'enabled' : 'server-not-configured',
      cleanup: () => listeners.forEach(listener => { void listener.remove() }),
    }
  } catch (error) {
    listeners.forEach(listener => { void listener.remove() })
    throw error
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export const unregisterOwnerPushNotifications = async (): Promise<void> => {
  const storedToken = await SecureStorage.get(storedPushTokenKey)
  if (typeof storedToken === 'string') {
    const response = await ownerAuthAdapter.fetch(ownerApiUrl('/api/admin/notifications/device'), {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token: storedToken}),
    })
    if (!response.ok) throw new Error('The owner service could not unregister this device.')
  }

  await PushNotifications.unregister()
  await SecureStorage.remove(storedPushTokenKey)
}
