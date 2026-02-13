// sw.js - Service Worker for Push Notifications (Android/Chrome friendly)

self.addEventListener("install", (event) => {
  console.log("[sw] installing...")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[sw] activated")
  event.waitUntil(clients.claim())
})

self.addEventListener("push", (event) => {
  console.log("[sw] push received")

  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch (e) {
      console.error("[sw] could not parse push payload as json:", e)
      payload = {}
    }
  }

  const title = payload.title || "EMD Vereinsapp"

  const dataObj = payload.data && typeof payload.data === "object" ? payload.data : {}

  const options = {
    body: payload.body || "Neue Benachrichtigung",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",

    // Gruppierung pro Chat
    tag: payload.tag || "emd-notification",
    renotify: !!payload.renotify,

    // wichtig fürs routing beim click
    data: {
      ...dataObj,
      // fallback url
      url: dataObj.url || payload.url || "/",
    },

    // Android nice
    vibrate: [200, 100, 200],
  }

  if (typeof payload.timestamp === "number") {
    options.timestamp = payload.timestamp
  }

  if (payload.image) {
    options.image = payload.image
  }

  if (Array.isArray(payload.actions)) {
    options.actions = payload.actions
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  const action = event.action // "open" | "reply" | "" (body click)
  const data = event.notification?.data || {}
  event.notification.close()

  const isChatPush = !!data.scope && !!data.room_id

  let targetUrl = data.url || "/veranstaltungen"

  if (isChatPush) {
    const scope = encodeURIComponent(String(data.scope))
    const room = encodeURIComponent(String(data.room_id))
    targetUrl = `/chat-app?scope=${scope}&roomId=${room}`

    // optional: wenn "reply" gedrückt wurde, könntest du z.B. ?focus=reply setzen
    if (action === "reply") {
      targetUrl += "&focus=reply"
    }
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const origin = self.location.origin
      let bestClient = null

      for (const client of clientList) {
        if (!client?.url) continue
        if (!client.url.startsWith(origin)) continue

        // wenn chat schon offen: den nehmen
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
