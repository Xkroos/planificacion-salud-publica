import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isAuthRoute = nextUrl.pathname === '/login' || nextUrl.pathname === '/sistema/login'
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth')
  const isPublic = isAuthRoute || isApiAuth

  if (isPublic) {
    if (isLoggedIn && isAuthRoute) {
      const url = req.nextUrl.clone()
      url.pathname = '/sistema'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    if (nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/sistema/login'
    return NextResponse.redirect(url)
  }

  // Proteger rutas solo de admin
  const isAdminRoute = nextUrl.pathname.startsWith('/usuarios')
  if (isAdminRoute && req.auth?.user?.role !== 'ADMIN') {
    const url = req.nextUrl.clone()
    url.pathname = '/sistema'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
