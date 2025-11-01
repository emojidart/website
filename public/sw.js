// Service Worker for Push Notifications

self.addEventListener("install", (event) => {
  console.log("Service Worker installiert")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("Service Worker aktiviert")
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  console.log("Push-Benachrichtigung empfangen:", event)

  let data = {
    title: "EMD Dart",
    body: "Neue Benachrichtigung",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: "/",
    },
  }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch (e) {
      console.error("Fehler beim Parsen der Push-Daten:", e)
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      {
        action: "open",
        title: "Öffnen",
      },
      {
        action: "close",
        title: "Schließen",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener("notificationclick", (event) => {
  console.log("Benachrichtigung geklickt:", event)
  event.notification.close()

  if (event.action === "close") {
    return
  }

  const urlToOpen = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Prüfe, ob bereits ein Fenster offen ist
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus()
        }
      }
      // Öffne neues Fenster
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    }),
  )
})
