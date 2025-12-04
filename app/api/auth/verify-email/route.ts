import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    console.log('🔐 Verifying email with token:', token);

    // Find verification record
    const verification = await prisma.verification.findUnique({
      where: { id: token },
    });

    if (!verification) {
      console.log('❌ Verification token not found');
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      console.log('❌ Verification token expired');
      // Delete expired token
      await prisma.verification.delete({
        where: { id: token },
      });
      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Find user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verification.identifier },
    });

    if (!user) {
      console.log('❌ User not found for email:', verification.identifier);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      console.log('✅ Email already verified');
      // Delete token even if already verified
      await prisma.verification.delete({
        where: { id: token },
      });
      return NextResponse.json({
        success: true,
        message: 'Email is already verified',
        alreadyVerified: true,
      });
    }

    // Update user email verification status
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // Delete verification token
    await prisma.verification.delete({
      where: { id: token },
    });

    console.log('✅ Email verified successfully for:', user.email);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        email: user.email,
        emailVerified: true,
      },
    });
  } catch (error: any) {
    console.error('❌ Verification error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during verification' },
      { status: 500 }
    );
  }
}

