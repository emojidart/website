// sw.js
// Service Worker for Push Notifications (Chat-style grouping + "X neue Nachrichten")

// ---- Mini IndexedDB helpers (für unread counter pro chat-tag)
const DB_NAME = "emd_push_db"
const DB_VERSION = 1
const STORE = "counts"

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getCount(key) {
  const db = await openDb()
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly")
    const store = tx.objectStore(STORE)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result || 0)
    req.onerror = () => resolve(0)
  })
}

async function setCount(key, value) {
  const db = await openDb()
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    store.put(value, key)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => resolve(false)
  })
}

async function clearCount(key) {
  const db = await openDb()
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    store.delete(key)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => resolve(false)
  })
}

self.addEventListener("install", () => {
  console.log("[v5] Service Worker installing...")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[v5] Service Worker activated")
  event.waitUntil(clients.claim())
})

self.addEventListener("push", (event) => {
  event.waitUntil(handlePush(event))
})

async function handlePush(event) {
  console.log("[v5] Push notification received")

  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    console.warn("[v5] Push JSON parse failed", e)
    data = {}
  }

  // payload fields (von deinem Server)
  const title = data.title || "EMD Vereinsapp"
  const body = data.body || "Neue Nachricht"
  const icon = data.icon || "/icon-192.png"
  const badge = data.badge || "/icon-192.png"
  const tag = data.tag || "emd-notification"
  const renotify = !!data.renotify

  const payloadData = {
    url: data.url,
    link: data.link,
    room_id: data.room_id,
    scope: data.scope,
  }

  // ✅ WhatsApp-like: pro Chat-Tag mitzählen
  // Nur wenn es wie ein Chat aussieht (scope+room_id da)
  const isChatPush = !!payloadData.scope && !!payloadData.room_id

  let finalBody = body
  let count = 0

  if (isChatPush) {
    count = (await getCount(tag)) + 1
    await setCount(tag, count)

    // Wenn mehr als 1 -> "X neue Nachrichten"
    if (count > 1) {
      finalBody = `${count} neue Nachrichten`
    } else {
      finalBody = body // erste Nachricht zeigt Absender: Text
    }
  }

  // Optional: existierende Notification mit gleichem Tag wird ersetzt (Gruppierung)
  // Chrome/Android macht das dann wie "Thread"
  const options = {
    body: finalBody,
    icon,
    badge,
    tag,
    renotify: renotify, // wenn true, dann vibriert es auch wenn gleiche tag ersetzt wird
    vibrate: [200, 100, 200],
    data: {
      ...payloadData,
      _tag: tag,
      _count: count,
      _isChatPush: isChatPush,
    },
  }

  await self.registration.showNotification(title, options)
}

self.addEventListener("notificationclick", (event) => {
  event.waitUntil(handleClick(event))
})

async function handleClick(event) {
  console.log("[v5] Notification clicked")
  event.notification.close()

  const data = event.notification?.data || {}
  const isChatPush = !!data.scope && !!data.room_id

  // Counter zurücksetzen, wenn Chat-Notification geklickt wurde
  if (data._tag && data._isChatPush) {
    await clearCount(data._tag)

    // Optional: alle gleichen tags schließen
    const notifs = await self.registration.getNotifications({ tag: data._tag })
    notifs.forEach((n) => n.close())
  }

  let targetUrl = data.url || data.link || "/veranstaltungen"

  if (isChatPush) {
    const scope = encodeURIComponent(String(data.scope))
    const room = encodeURIComponent(String(data.room_id))
    targetUrl = `/chat-app?scope=${scope}&roomId=${room}`
  }

  const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true })
  const origin = self.location.origin

  let bestClient = null
  for (const client of clientList) {
    if (!client?.url) continue
    if (!client.url.startsWith(origin)) continue
    if (client.url.includes("/chat-app")) {
      bestClient = client
      break
    }
    if (!bestClient) bestClient = client
  }

  if (bestClient && "focus" in bestClient) {
    await bestClient.focus()
    if ("navigate" in bestClient) {
      return bestClient.navigate(targetUrl)
    }
    return
  }

  if (clients.openWindow) {
    return clients.openWindow(targetUrl)
  }
}
