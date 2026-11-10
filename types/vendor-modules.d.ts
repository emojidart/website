/** Minimal declarations for installed browser and push libraries.
 * These match the public interfaces used by this application.
 */
declare module "web-push" {
  interface PushSubscription {
    endpoint: string
    keys: { auth: string; p256dh: string }
  }
  interface WebPush {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void
    sendNotification(subscription: PushSubscription, payload?: string): Promise<unknown>
  }
  const webpush: WebPush
  export default webpush
}

declare module "canvas-confetti" {
  interface ConfettiOptions {
    particleCount?: number
    spread?: number
    origin?: { x?: number; y?: number }
    angle?: number
    startVelocity?: number
    scalar?: number
    gravity?: number
    ticks?: number
    colors?: string[]
    shapes?: string[]
    zIndex?: number
    disableForReducedMotion?: boolean
  }
  export default function confetti(options?: ConfettiOptions): Promise<null> | null
}

declare module "file-saver" {
  export function saveAs(data: Blob | string, filename?: string): void
}
