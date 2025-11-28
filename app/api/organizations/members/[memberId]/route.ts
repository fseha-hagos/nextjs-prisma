import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// DELETE - Remove a member from an organization
export async function DELETE(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { memberId } = params;
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Remove member using Better Auth
    await auth.api.removeMemberFromOrganization({
      body: {
        organizationId: orgId,
        userId: memberId,
      },
      headers: req.headers,
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

