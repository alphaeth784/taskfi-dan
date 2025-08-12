import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, PermissionService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/categories/[id] - Get category with jobs and gigs
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        jobs: {
          where: { status: 'OPEN' },
          select: {
            id: true,
            title: true,
            description: true,
            budget: true,
            deadline: true,
            isUrgent: true,
            tags: true,
            hirer: {
              select: {
                name: true,
                username: true,
                avatarUrl: true,
                rating: true,
              },
            },
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        gigs: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            title: true,
            description: true,
            packages: true,
            gallery: true,
            rating: true,
            orderCount: true,
            freelancer: {
              select: {
                name: true,
                username: true,
                avatarUrl: true,
                rating: true,
              },
            },
            createdAt: true,
          },
          orderBy: { rating: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            jobs: { where: { status: 'OPEN' } },
            gigs: { where: { status: 'ACTIVE' } },
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Get category error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/categories/[id] - Update category (admin only)
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!PermissionService.canManageCategories(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json()
    const updateData = updateCategorySchema.parse(body)

    // Check if new name conflicts with existing category
    if (updateData.name) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: updateData.name,
          NOT: { id: params.id },
        },
      })

      if (existingCategory) {
        return NextResponse.json(
          { error: 'Category name already exists' },
          { status: 400 }
        )
      }
    const category = await prisma.category.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete category (admin only)
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!PermissionService.canManageCategories(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // Check if category has associated jobs or gigs
    const categoryUsage = await prisma.category.findUnique({
      where: { id: params.id },
      select: {
        _count: {
          select: {
            jobs: true,
            gigs: true,
          },
        },
      },
    })

    if (!categoryUsage) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    if (categoryUsage._count.jobs > 0 || categoryUsage._count.gigs > 0) {
      // Soft delete by setting isActive to false
      await prisma.category.update({
        where: { id: params.id },
        data: { isActive: false },
      })
      return NextResponse.json({ message: 'Category deactivated successfully' })
    } else {
      // Hard delete if no associated data
      await prisma.category.delete({
        where: { id: params.id },
      })
      return NextResponse.json({ message: 'Category deleted successfully' })
    }
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
