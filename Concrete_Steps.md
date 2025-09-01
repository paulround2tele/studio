Concrete steps

Server authority
Keep middleware.ts as the single gating mechanism; ensure matcher excludes /api, /_next, and static assets. It already reads SESSION_CONFIG and handles /login<->/dashboard redirects.
Root permanent redirect
Convert page.tsx to a server component using permanentRedirect('/dashboard').
This avoids any client-side loading splash and prevents double renders.
Remove client redirect logic from layout
In AdvancedConditionalLayout.tsx, do not call router.push or do auth gating. Only render:
Public paths: render children.
Protected paths: render AppLayout; middleware ensures only authed traffic arrives.
Normalize action flows
Login: Keep direct router.replace('/dashboard') after login success (in LoginForm.tsx).
Logout: Keep direct router.replace('/login') after a successful logout request (ensure credentials: 'include'). You already did this.
Eliminate window.location and ad-hoc redirects
Replace window.location.* redirects with a centralized helper that calls router.replace when on client, or renders a button to “Go to Login” for error boundaries.
Files to adjust:
NetworkErrorHandler.tsx
GlobalErrorBoundary.tsx
UserProfile.tsx
useCachedAuth.tsx (avoid unconditional window.location on logout; rely on logout page or a passed-in navigate helper).
Don’t duplicate backend logic
Avoid “are we authenticated?” checks in client hooks to control navigation.
Keep useCachedAuth for login/logout UX and user info, not for redirect decisions. Remove the “Checking authentication…” blocking branch (you did this in LoginForm) and any layout gating that depends on this hook.
Optional: tiny server-side cache of auth presence
If you need to hint the layout about “auth present” to avoid UI flashes, add a short-lived non-sensitive cookie (e.g., auth_presence=1/0; Max-Age=30s) updated in middleware on each request. Layout can read this cookie to render small UI affordances without triggering redirects or dynamic routing logic. This is purely cosmetic—middleware remains the source of truth.
API routing and rewrites sanity
Keep next.config.ts rewrites for /api/v2. Ensure middleware excludes /api so it never intercepts API traffic (done).
Tests and verification
Headless checks (these validate no flicker/loops, only server redirects):
Unauthed GET / → 307/308 to /login or /dashboard per policy.
Unauthed GET /dashboard → 307/308 to /login.
Authed (cookie set) GET /login → 307/308 to /dashboard.
Authed GET /dashboard → 200.
Add Playwright E2E:
Visiting /login unauthenticated shows the login form immediately.
Submitting valid credentials lands on /dashboard with no intermediate flash.
Visiting /dashboard after logout redirects to /login.
Logging and diagnostics
Keep lightweight server logs in middleware for redirect decisions (dev only).
Remove verbose client logs that spam consoles and can mask timing issues.