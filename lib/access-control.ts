export const MEMBER_LOGIN_ROUTE = "/member-login"
export const GUEST_LOGIN_ROUTE = "/guest-login"
export const GUEST_HOME_ROUTE = "/guest-profile-app"
export const MEMBER_HOME_ROUTE = "/member-profile-app"

export const publicRoutes = [
  "/",
  "/gastzugang",
  "/guest-login",
  "/member-login",
  "/login-auswahl",
  "/impressum",
  "/datenschutz",
]

export const guestRoutes = [
  "/guest-profile-app",
  "/guest-calendar",
  "/guest-events",
  "/guest-turniere",
  "/guest-tournaments",
  "/guest-rankings",
  "/guest-ranking",
  "/guest-profile",
]

export const forbiddenForGuestsRoutes = [
  "/member-profile-app",
  "/push_preferences",
  "/member-dashboard-app",
  "/member-availability",
  "/meine-teams-app",
  "/member-statistics-app",
  "/team-print-sheet",
  "/training_event",
  "/training-app",
  "/lobby-app",
  "/match-galerie",
  "/member-bonus-app",
  "/member-league-app",
  "/vereinskalender-app",
  "/community-app",
  "/chat-app",
  "/support-app",
  "/profil-daten-app",
  "/member-card",
]

function normalizePath(pathname: string) {
  if (!pathname) return "/"

  let path = pathname.trim()

  if (!path.startsWith("/")) {
    path = `/${path}`
  }

  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1)
  }

  return path
}

function pathMatches(pathname: string, routes: string[]) {
  const path = normalizePath(pathname)

  return routes.some((route) => {
    const cleanRoute = normalizePath(route)
    return path === cleanRoute || path.startsWith(`${cleanRoute}/`)
  })
}

export function isPublicPath(pathname: string) {
  return pathMatches(pathname, publicRoutes)
}

export function isGuestPath(pathname: string) {
  return pathMatches(pathname, guestRoutes)
}

export function isForbiddenForGuestsPath(pathname: string) {
  return pathMatches(pathname, forbiddenForGuestsRoutes)
}

export function isProtectedMemberPath(pathname: string) {
  return isForbiddenForGuestsPath(pathname)
}