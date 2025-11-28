import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Get a specific outline
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    const outline = await prisma.outline.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!outline) {
      return NextResponse.json(
        { error: 'Outline not found' },
        { status: 404 }
      );
    }

    // Verify user is a member of the organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: outline.organizationId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    return NextResponse.json(outline);
  } catch (error: any) {
    console.error('Failed to fetch outline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch outline' },
      { status: 500 }
    );
  }
}

// PUT - Update an outline
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { header, sectionType, status, reviewer, target, limit } = body;

    // Get the outline first to check permissions
    const outline = await prisma.outline.findUnique({
      where: { id },
    });

    if (!outline) {
      return NextResponse.json(
        { error: 'Outline not found' },
        { status: 404 }
      );
    }

    // Verify user is a member of the organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: outline.organizationId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Update outline
    const updatedOutline = await prisma.outline.update({
      where: { id },
      data: {
        ...(header !== undefined && { header }),
        ...(sectionType !== undefined && { sectionType }),
        ...(status !== undefined && { status }),
        ...(reviewer !== undefined && { reviewer }),
        ...(target !== undefined && { target: target ? parseInt(target) : null }),
        ...(limit !== undefined && { limit: limit ? parseInt(limit) : null }),
      },
    });

    return NextResponse.json(updatedOutline);
  } catch (error: any) {
    console.error('Failed to update outline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update outline' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an outline
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get the outline first to check permissions
    const outline = await prisma.outline.findUnique({
      where: { id },
    });

    if (!outline) {
      return NextResponse.json(
        { error: 'Outline not found' },
        { status: 404 }
      );
    }

    // Verify user is a member of the organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: outline.organizationId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Delete outline
    await prisma.outline.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete outline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete outline' },
      { status: 500 }
    );
  }
}

