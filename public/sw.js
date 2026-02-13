// sw.js
// Service Worker for Push Notifications

self.addEventListener("install", (event) => {
  console.log("[v4] Service Worker installing...")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[v4] Service Worker activated")
  event.waitUntil(clients.claim())
})

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("[v4] Push notification received:", event)

  let notificationData = {
    title: "EMD Vereinsapp",
    body: "Neue Benachrichtigung",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    image: undefined,
    tag: "emd-notification",
    renotify: false,
    data: {},
  }

  if (event.data) {
    try {
      const data = event.data.json()

      const mergedData = data?.data && typeof data.data === "object" ? data.data : {}

      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        image: data.image || notificationData.image,
        tag: data.tag || notificationData.tag,
        renotify: !!data.renotify,
        data: {
          ...mergedData,
          url: data.url ?? mergedData.url,
          link: data.link ?? mergedData.link,
          room_id: data.room_id ?? mergedData.room_id,
          scope: data.scope ?? mergedData.scope,
        },
      }
    } catch (e) {
      console.error("[v4] Error parsing push data:", e)
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    vibrate: [200, 100, 200],

    // ✅ Gruppierung pro Chat
    tag: notificationData.tag,

    // ✅  wenn gleiche tag... soll neue Nachricht trotzdem vibrieren
    renotify: notificationData.renotify,
  }

  if (notificationData.image) {
    notificationOptions.image = notificationData.image
  }

  event.waitUntil(self.registration.showNotification(notificationData.title, notificationOptions))
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[v4] Notification clicked:", event)
  event.notification.close()

  const data = event.notification?.data || {}
  const isChatPush = !!data.scope && !!data.room_id

  // Default fallback for non-chat pushes:
  let targetUrl = data.url || data.link || "/veranstaltungen"

  if (isChatPush) {
    const scope = encodeURIComponent(String(data.scope))
    const room = encodeURIComponent(String(data.room_id))
    targetUrl = `/chat-app?scope=${scope}&roomId=${room}`
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const targetOrigin = self.location.origin
      let bestClient = null

      for (const client of clientList) {
        if (!client?.url) continue
        if (!client.url.startsWith(targetOrigin)) continue

        if (client.url.includes("/chat-app")) {
          bestClient = client
          break
        }
        if (!bestClient) bestClient = client
      }

      if (bestClient && "focus" in bestClient) {
        return bestClient.focus().then(() => {
          if ("navigate" in bestClient) {
            return bestClient.navigate(targetUrl)
          }
        })
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    }),
  )
})
