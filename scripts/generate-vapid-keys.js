import webpush from "web-push"

const vapidKeys = webpush.generateVAPIDKeys()

console.log("\n========================================")
console.log("🔑 VAPID Keys Generated Successfully")
console.log("========================================\n")
console.log("📋 Public Key (für Browser):")
console.log(vapidKeys.publicKey)
console.log("\n🔐 Private Key (für Server - GEHEIM!)")
console.log(vapidKeys.privateKey)
console.log("\n========================================")
console.log("⚙️  Netlify Environment Variables:")
console.log("========================================\n")
console.log("Name: NEXT_PUBLIC_VAPID_PUBLIC_KEY")
console.log("Value: " + vapidKeys.publicKey)
console.log("\nName: VAPID_PRIVATE_KEY")
console.log("Value: " + vapidKeys.privateKey)
console.log("\n========================================\n")
