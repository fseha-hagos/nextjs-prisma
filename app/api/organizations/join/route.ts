import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

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

    // If token (invitation ID) is provided, accept invitation by ID
    if (token) {
      console.log('📧 Accepting invitation with token:', token);
      
      // Find the invitation
      const invitation = await prisma.invite.findUnique({
        where: { id: token },
        include: {
          organization: true,
        },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        );
      }

      // Check if invitation is expired
      if (invitation.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'This invitation has expired' },
          { status: 400 }
        );
      }

      // Check if invitation is already accepted
      if (invitation.status !== 'pending') {
        return NextResponse.json(
          { error: 'This invitation has already been processed' },
          { status: 400 }
        );
      }

      // Check if the email matches (if user is already registered)
      // Or if user is new, they'll sign up with the invited email
      const userEmail = session.user.email;
      if (userEmail && invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
        return NextResponse.json(
          { error: `This invitation was sent to ${invitation.email}, but you are signed in as ${userEmail}. Please sign out and sign up with the invited email address.` },
          { status: 400 }
        );
      }

      // Check if user is already a member
      const existingMember = await prisma.member.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMember) {
        // User is already a member, just mark invitation as accepted
        await prisma.invite.update({
          where: { id: token },
          data: { status: 'accepted' },
        });
        return NextResponse.json({
          success: true,
          message: 'You are already a member of this organization',
          alreadyMember: true,
        });
      }

      // Create the member relationship
      await prisma.member.create({
        data: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      // Update invitation status
      await prisma.invite.update({
        where: { id: token },
        data: { status: 'accepted' },
      });

      console.log('✅ Invitation accepted successfully');

      return NextResponse.json({
        success: true,
        message: `Successfully joined ${invitation.organization.name}`,
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
        },
      });
    }

    // Otherwise, try to find and accept invitation by email
    if (!email) {
      return NextResponse.json(
        { error: 'Email or invitation token is required' },
        { status: 400 }
      );
    }

    // Find invitation by email
    const invitation = await prisma.invite.findFirst({
      where: {
        email: email.toLowerCase(),
        status: 'pending',
      },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'No pending invitation found for this email address' },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.member.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
        },
      },
    });

    if (existingMember) {
      await prisma.invite.update({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      });
      return NextResponse.json({
        success: true,
        message: 'You are already a member of this organization',
        alreadyMember: true,
      });
    }

    // Create the member relationship
    await prisma.member.create({
      data: {
        userId: session.user.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });

    // Update invitation status
    await prisma.invite.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully joined ${invitation.organization.name}`,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
    });
  } catch (error: any) {
    console.error('Failed to join organization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to join organization' },
      { status: 500 }
    );
  }
}

