import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Use Better Auth's API method
    let result;
    try {
      result = await auth.api.signInEmail({
        body: {
          email,
          password,
        },
        headers: req.headers,
      });
    } catch (authError: any) {
      // Better-auth might throw an error for unverified users
      // Check if it's an email verification error
      if (authError.message?.toLowerCase().includes('verify') || 
          authError.message?.toLowerCase().includes('email') ||
          authError.message?.toLowerCase().includes('unverified')) {
        return NextResponse.json(
          { 
            error: 'Please verify your email address before signing in. Check your inbox (and spam folder) for the verification link.',
            requiresVerification: true
          },
          { status: 403 }
        );
      }
      throw authError;
    }

    // Check if email is verified
    if (result.user && !result.user.emailVerified) {
      return NextResponse.json(
        { 
          error: 'Please verify your email address before signing in. Check your inbox (and spam folder) for the verification link.',
          requiresVerification: true
        },
        { status: 403 }
      );
    }

    // Create response with user data
    const response = NextResponse.json({ 
      success: true,
      user: result.user 
    });

    // Better Auth's signInEmail creates a session
    // We need to get the session and create the cookie manually
    if (result.user) {
      // Get the session to create the cookie
      const session = await auth.api.getSession({ headers: req.headers });
      
      if (session?.session) {
        // Create session cookie (Better Auth format)
        const sessionToken = session.session.token || session.session.id;
        if (sessionToken) {
          // Set the session cookie
          response.cookies.set('better-auth.session_token', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
        }
      }
    }

    return response;
  } catch (error: any) {
    console.error('Sign-in error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during sign in' },
      { status: 500 }
    );
  }
}

