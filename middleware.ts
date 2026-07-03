import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth, clerkClient, clerkMiddleware } from '@clerk/nextjs/server';

async function runChecks(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const { userId } = getAuth(req as unknown as Request);
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      return NextResponse.redirect(signInUrl);
    }
    // Check role from Clerk publicMetadata
    const client = await clerkClient();
    const user = await client.users.getUser(userId).catch(() => null);
    let role: string | undefined = undefined;
    if (user && typeof user.publicMetadata === 'object' && user.publicMetadata !== null) {
      const pm = user.publicMetadata as Record<string, unknown>;
      if (typeof pm['role'] === 'string') role = pm['role'];
    }
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Protect profile and settings
  if (pathname.startsWith('/profile') || pathname.startsWith('/settings')) {
    const { userId } = getAuth(req as unknown as Request);
    if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  return NextResponse.next();
}

const clerkMw = clerkMiddleware();

export default async function middleware(req: NextRequest) {
  // Run Clerk middleware first so Clerk can set up request context
  const maybe = await clerkMw(req as unknown as Request, {} as unknown as RequestInit);
  if (maybe) return maybe;

  // Then run our app-specific checks
  return runChecks(req);
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/settings/:path*']
};
