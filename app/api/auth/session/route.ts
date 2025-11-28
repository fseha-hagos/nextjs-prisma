import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Pass headers with cookies to Better Auth
    const session = await auth.api.getSession({ 
      headers: req.headers,
    });
    
    return NextResponse.json({ 
      user: session?.user || null,
      session: session || null
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null, session: null });
  }
}

