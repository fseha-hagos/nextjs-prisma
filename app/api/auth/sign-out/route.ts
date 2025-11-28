import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await auth.api.signOut({
      headers: req.headers,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during sign out' },
      { status: 500 }
    );
  }
}

