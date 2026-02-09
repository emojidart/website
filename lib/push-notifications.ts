// Utility functions for Push Notifications

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.log("Service Worker wird nicht unterstützt")
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    })
    console.log("Service Worker registriert:", registration)
    return registration
  } catch (error) {
    console.error("Service Worker Registrierung fehlgeschlagen:", error)
    return null
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.log("Benachrichtigungen werden nicht unterstützt")
    return "denied"
  }

  const permission = await Notification.requestPermission()
  return permission
}

export async function subscribeToPushNotifications(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscriptionData | null> {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      throw new Error("VAPID Public Key fehlt")
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
        auth: arrayBufferToBase64(subscription.getKey("auth")!),
      },
    }

    return subscriptionData
  } catch (error) {
    console.error("Push-Abonnement fehlgeschlagen:", error)
    return null
  }
}

/**
 * NEW: Save subscription to your API route.
 * IMPORTANT: pass the Supabase access_token from the client (logged-in user),
 * otherwise the server cannot set user_id (it will stay NULL).
 */
export async function savePushSubscriptionToServer(
  subscriptionData: PushSubscriptionData,
  accessToken?: string | null,
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(subscriptionData),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      return { ok: false, status: res.status, data: json, error: json?.error || "Request failed" }
    }

    return { ok: true, status: res.status, data: json }
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message ?? "Network error" }
  }
}

/**
 * NEW: Convenience helper - does subscribe + save in one call.
 * You still need to request permission before calling this, and pass accessToken for user_id.
 */
export async function subscribeAndSavePushNotifications(
  registration: ServiceWorkerRegistration,
  accessToken?: string | null,
): Promise<{ ok: boolean; subscription?: PushSubscriptionData | null; server?: any; error?: string }> {
  const subscriptionData = await subscribeToPushNotifications(registration)
  if (!subscriptionData) {
    return { ok: false, subscription: null, error: "subscribe_failed" }
  }

  const saved = await savePushSubscriptionToServer(subscriptionData, accessToken)
  if (!saved.ok) {
    return { ok: false, subscription: subscriptionData, server: saved.data, error: saved.error || "save_failed" }
  }

  return { ok: true, subscription: subscriptionData, server: saved.data }
}

export async function unsubscribeFromPushNotifications(registration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      return true
    }
    return false
  } catch (error) {
    console.error("Abmeldung fehlgeschlagen:", error)
    return false
  }
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
