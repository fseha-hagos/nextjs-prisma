import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

// DELETE - Remove a member from an organization
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { memberId } = await params;
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Verify the current user is an owner
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
        { error: 'Only organization owners can remove members' },
        { status: 403 }
      );
    }

    // Get the member to be removed
    const memberToRemove = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!memberToRemove) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Don't allow removing owners
    if (memberToRemove.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove organization owners' },
        { status: 403 }
      );
    }

    // Remove member using Prisma
    await prisma.member.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to remove member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove member' },
      { status: 500 }
    );
  }
}

