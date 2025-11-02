// Service Worker for Push Notifications
self.addEventListener("install", (event) => {
  console.log("[v0] Service Worker installing...")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[v0] Service Worker activated")
  event.waitUntil(clients.claim())
})

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("[v0] Push notification received:", event)

  let notificationData = {
    title: "EMD Dart",
    body: "Neue Benachrichtigung",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {},
  }

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
      }
    } catch (e) {
      console.error("[v0] Error parsing push data:", e)
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      tag: "emd-dart-notification",
    }),
  )
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[v0] Notification clicked:", event)
  event.notification.close()

  event.waitUntil(clients.openWindow("/"))
})
