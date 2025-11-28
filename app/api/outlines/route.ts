import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - List all outlines for an organization
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

    // Verify user is a member of the organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: orgId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Get outlines for the organization
    const outlines = await prisma.outline.findMany({
      where: {
        organizationId: orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(outlines);
  } catch (error: any) {
    console.error('Failed to fetch outlines:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch outlines' },
      { status: 500 }
    );
  }
}

// POST - Create a new outline
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
    const { header, sectionType, status, reviewer, target, limit, organizationId } = body;

    if (!header || !sectionType || !status || !reviewer || !organizationId) {
      return NextResponse.json(
        { error: 'Header, section type, status, reviewer, and organization ID are required' },
        { status: 400 }
      );
    }

    // Verify user is a member of the organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Create outline
    const outline = await prisma.outline.create({
      data: {
        header,
        sectionType,
        status,
        reviewer,
        target: target ? parseInt(target) : null,
        limit: limit ? parseInt(limit) : null,
        organizationId,
      },
    });

    return NextResponse.json(outline);
  } catch (error: any) {
    console.error('Failed to create outline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create outline' },
      { status: 500 }
    );
  }
}

