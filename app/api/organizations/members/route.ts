import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

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
    const members = await prisma.organizationMember.findMany({
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // User exists, add them directly to the organization
      try {
        await auth.api.addMemberToOrganization({
          body: {
            organizationId: orgId,
            userId: user.id,
            role,
          },
          headers: req.headers,
        });
        return NextResponse.json({ success: true, message: 'Member added successfully' });
      } catch (error: any) {
        // If member already exists, return success
        if (error.message?.includes('already') || error.message?.includes('exists')) {
          return NextResponse.json({ success: true, message: 'Member already exists' });
        }
        throw error;
      }
    } else {
      // User doesn't exist, create an invitation
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

      const invitation = await prisma.invitation.create({
        data: {
          email,
          organizationId: orgId,
          role,
          expiresAt,
          status: 'pending',
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Invitation created',
        invitation 
      });
    }
  } catch (error: any) {
    console.error('Failed to invite member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to invite member' },
      { status: 500 }
    );
  }
}

