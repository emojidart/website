// sw.js
// Service Worker for Push Notifications

self.addEventListener("install", (event) => {
  console.log("[v2] Service Worker installing...")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[v2] Service Worker activated")
  event.waitUntil(clients.claim())
})

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("[v2] Push notification received:", event)

  let notificationData = {
    title: "EMD Vereinsapp",
    body: "Neue Benachrichtigung",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    image: undefined,
    // IMPORTANT: data object that will be available on click
    data: {},
  }

  if (event.data) {
    try {
      const data = event.data.json()

      // ✅ Support BOTH formats:
      // 1) data.data (your previous event push format)
      // 2) direct fields (our chat push route sends url/room_id/scope at top-level)
      const mergedData =
        data?.data && typeof data.data === "object"
          ? data.data
          : {}

      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        image: data.image || notificationData.image,
        data: {
          ...mergedData,
          // keep top-level helpers too (in case payload uses them)
          url: data.url ?? mergedData.url,
          link: data.link ?? mergedData.link,
          room_id: data.room_id ?? mergedData.room_id,
          scope: data.scope ?? mergedData.scope,
        },
      }
    } catch (e) {
      console.error("[v2] Error parsing push data:", e)
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    vibrate: [200, 100, 200],
    tag: "emd-dart-notification",
  }

  if (notificationData.image) {
    notificationOptions.image = notificationData.image
  }

  event.waitUntil(self.registration.showNotification(notificationData.title, notificationOptions))
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[v2] Notification clicked:", event)
  event.notification.close()

  const data = event.notification?.data || {}

  // ✅ Chat deep-link:
  // If it’s a chat push we expect scope + room_id
  const isChatPush = !!data.scope && !!data.room_id

  // Default fallback for non-chat pushes:
  let targetUrl = data.url || data.link || "/veranstaltungen"

  if (isChatPush) {
    // Open chat, and include params (optional, later you can auto-select the room in the chat page)
    const params = new URLSearchParams()
    params.set("scope", String(data.scope))
    params.set("room", String(data.room_id))
    targetUrl = `/chat-app?${params.toString()}`
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If any window is open, focus it and navigate there
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus().then(() => {
            // navigate if possible
            if ("navigate" in client) {
              return client.navigate(targetUrl)
            }
          })
        }
      }

      // If no window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    }),
  )
})
