import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { sendInvitationEmail } from '@/lib/email';

// GET - List members of an organization
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get organization members from database
    const members = await prisma.member.findMany({
      where: {
        organizationId: orgId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(members);
  } catch (error: any) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST - Invite a member to an organization
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
    const { orgId, email, role = 'member' } = body;

    if (!orgId || !email) {
      return NextResponse.json(
        { error: 'Organization ID and email are required' },
        { status: 400 }
      );
    }

    // Only organization owners can invite members
    const currentUserMember = await prisma.member.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: orgId,
        },
      },
    });

    if (!currentUserMember || currentUserMember.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can invite members' },
        { status: 403 }
      );
    }

    // Enforce a single owner per organization
    if (role === 'owner') {
      const existingOwner = await prisma.member.findFirst({
        where: {
          organizationId: orgId,
          role: 'owner',
        },
      });

      if (existingOwner) {
        return NextResponse.json(
          { error: 'Each organization can have only one owner. Invite members as \"member\" instead.' },
          { status: 400 }
        );
      }
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // User exists, add them directly to the organization using Prisma
      try {
        // Check if member already exists
        const existingMember = await prisma.member.findUnique({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: orgId,
            },
          },
        });

        if (existingMember) {
          return NextResponse.json({ success: true, message: 'Member already exists' });
        }

        // Create new member
        await prisma.member.create({
          data: {
            userId: user.id,
            organizationId: orgId,
            role,
          },
        });

        return NextResponse.json({ success: true, message: 'Member added successfully' });
      } catch (error: any) {
        // If member already exists (unique constraint violation), return success
        if (error.code === 'P2002' || error.message?.includes('already') || error.message?.includes('exists')) {
          return NextResponse.json({ success: true, message: 'Member already exists' });
        }
        throw error;
      }
    } else {
      // User doesn't exist, create an invitation
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

      try {
        // Check if invitation already exists
        const existingInvite = await prisma.invite.findUnique({
          where: {
            email_organizationId: {
              email,
              organizationId: orgId,
            },
          },
        });

        if (existingInvite) {
          // Update existing invitation
          const invitation = await prisma.invite.update({
            where: {
              email_organizationId: {
                email,
                organizationId: orgId,
              },
            },
            data: {
              role,
              expiresAt,
              status: 'pending',
            },
          });

          // alert(`Sending invitation email to ${email}`);
          console.log(`Sending invitation email to ${email}`);

          sendInvitationEmail(
            email,
            invitation.id,
            "Acme <onboarding@resend.dev>"
          );

          return NextResponse.json({ 
            success: true, 
            message: 'Invitation updated',
            invitation 
          });
        } else {
          // Create new invitation
          const invitation = await prisma.invite.create({
            data: {
              email,
              organizationId: orgId,
              role,
              expiresAt,
              status: 'pending',
            },
          });
          // alert(`Sending invitation email to ${email}`);
          console.log(`Sending invitation email to ${email}`);

          sendInvitationEmail(
            email,
            invitation.id,
            "Acme <onboarding@resend.dev>"
          );

          return NextResponse.json({ 
            success: true, 
            message: 'Invitation created',
            invitation 
          });
        }
      } catch (error: any) {
        console.error('Failed to create invitation:', error);
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Failed to invite member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to invite member' },
      { status: 500 }
    );
  }
}

