import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || 
                      req.nextUrl.pathname.startsWith('/register')
    const isDashboard = req.nextUrl.pathname.startsWith('/dashboard')
    const isAdmin = token?.role === 'ADMIN'

    // Redirect authenticated users away from auth pages
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Redirect unauthenticated users to login
    if (isDashboard && !isAuth) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Check for temporary password
    if (isAuth && token?.isTemporaryPassword && !req.nextUrl.pathname.startsWith('/change-password')) {
      return NextResponse.redirect(new URL('/change-password', req.url))
    }

    // Admin-only routes
    const adminRoutes = ['/dashboard/team', '/dashboard/invite', '/dashboard/settings']
    if (adminRoutes.some(route => req.nextUrl.pathname.startsWith(route)) && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        if (req.nextUrl.pathname === '/' || 
            req.nextUrl.pathname.startsWith('/login') || 
            req.nextUrl.pathname.startsWith('/register') ||
            req.nextUrl.pathname.startsWith('/api/auth')) {
          return true
        }
        
        // Require authentication for all other routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
