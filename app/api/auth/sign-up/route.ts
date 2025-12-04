import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;


    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    // Use better-auth API to sign up
    const result = await auth.api.signUpEmail({
      body: {
        name: name || email.split('@')[0], // Use email prefix as name if not provided
        email,
        password,
      },
      headers: req.headers,
    });

    // Return success response - email verification will be sent automatically by better-auth
    return NextResponse.json({ 
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user: result.user,
      requiresVerification: true
    });
  } catch (error: any) {
    console.error('Sign-up error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during sign up' },
      { status: 500 }
    );
  }
}

