import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// POST - Accept an invitation to join an organization
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { email, token } = body;

    // If token is provided, accept invitation by token
    if (token) {
      const result = await auth.api.acceptInvitation({
        body: {
          token,
        },
        headers: req.headers,
      });

      return NextResponse.json(result.data);
    }

    // Otherwise, try to find and accept invitation by email
    // This is a custom implementation since Better Auth typically uses tokens
    if (!email) {
      return NextResponse.json(
        { error: 'Email or token is required' },
        { status: 400 }
      );
    }

    // For now, return an error suggesting token-based invitation
    return NextResponse.json(
      { error: 'Please use the invitation link sent to your email' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Failed to join organization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to join organization' },
      { status: 500 }
    );
  }
}

