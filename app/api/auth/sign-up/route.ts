import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

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
    console.log('📝 Sign-up request received:', { email, name });
    
    // Use better-auth API to sign up
    const result = await auth.api.signUpEmail({
      body: {
        name: name || email.split('@')[0], // Use email prefix as name if not provided
        email,
        password,
      },
      headers: req.headers,
    });

    console.log('✅ User created:', result.user?.email);
    console.log('   Email verified:', result.user?.emailVerified);

    // Manually send verification email since better-auth callback might not be triggered
    if (result.user && !result.user.emailVerified) {
      try {
        console.log('📧 Manually triggering verification email...');
        
        // Generate verification token using better-auth's internal method
        // Better-auth stores verification tokens in the verification table
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // Use better-auth's API to get the verification URL
        // We'll create the verification link manually
        const verificationResponse = await fetch(`${baseUrl}/api/auth/send-verification-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(req.headers.entries()),
          },
          body: JSON.stringify({ email }),
        }).catch(() => null);

        // If better-auth endpoint doesn't exist, create verification token manually
        if (!verificationResponse || !verificationResponse.ok) {
          console.log('   Better-auth endpoint not available, creating verification link manually...');
          
          // Import prisma to create verification token
          const prisma = (await import('@/lib/db')).default;
          
          // Check if verification token already exists
          const existingVerification = await prisma.verification.findFirst({
            where: {
              identifier: email,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          let token: string;
          if (existingVerification && existingVerification.expiresAt > new Date()) {
            // Use existing token
            token = existingVerification.value;
            console.log('   Using existing verification token');
          } else {
            // Create new verification token - better-auth uses cuid for id
            const { randomBytes } = await import('crypto');
            token = randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

            // Delete old verification tokens for this email
            await prisma.verification.deleteMany({
              where: {
                identifier: email,
              },
            });

            await prisma.verification.create({
              data: {
                id: token,
                identifier: email,
                value: token,
                expiresAt,
              },
            });

            console.log('   Created new verification token');
          }

          const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
          await sendVerificationEmail(email, verificationUrl, result.user.name || undefined);
        } else {
          console.log('   Verification email sent via better-auth endpoint');
        }
      } catch (emailError: any) {
        console.error('❌ Failed to send verification email manually:', emailError);
        // Don't fail the signup if email fails
      }
    }

    // Return success response
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

