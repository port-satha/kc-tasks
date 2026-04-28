import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes — accessible without a session
  const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/api']
  const isPublic = publicRoutes.some(p => pathname.startsWith(p))

  // Redirect unauthenticated users to login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login / forgot-password
  // (but let them stay on /reset-password — that's the post-click-from-email flow where they need a session)
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/forgot-password'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Profile completion is now enforced entirely by the non-dismissable
  // ProfileGate modal mounted inside AppShell — it intercepts the UI on
  // whatever route the user lands on, blocks app access until the three
  // required self-completed fields (nickname, full_name, position_title)
  // are filled, and only requires fields the member can actually set
  // themselves (team / squad / role / manager_id are admin-set per the
  // brief and were blocking incomplete users at the legacy /onboarding
  // form). The middleware redirect to /onboarding has been removed.

  return response
}
