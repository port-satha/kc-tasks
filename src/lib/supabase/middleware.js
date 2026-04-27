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

  // Check if profile is completed — the AppShell now mounts a non-dismissable
  // ProfileGate modal in front of every authenticated route, so the
  // /onboarding redirect here is largely vestigial. Kept as a fallback in
  // case AppShell isn't on the requested route.
  if (user && !pathname.startsWith('/onboarding') && !pathname.startsWith('/login') && !pathname.startsWith('/api')) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_complete')
        .eq('id', user.id)
        .single()

      if (profile && profile.profile_complete === false) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    } catch (e) {
      // Column may not exist yet — skip onboarding check
    }
  }

  return response
}
