import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, PermissionService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { id: string }
}

// GET /api/users/[id] - Get user profile
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        gigsAsFreelancer: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            title: true,
            packages: true,
            rating: true,
            orderCount: true,
            gallery: true,
            category: { select: { name: true } },
          },
          take: 6,
        },
        jobsAsHirer: {
          where: { status: 'OPEN' },
          select: {
            id: true,
            title: true,
            budget: true,
            deadline: true,
            category: { select: { name: true } },
          },
          take: 6,
        },
        receivedReviews: {
          where: { isPublic: true },
          select: {
            id: true,
            rating: true,
            comment: true,
            author: {
              select: {
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            gigsAsFreelancer: { where: { status: 'ACTIVE' } },
            jobsAsHirer: { where: { status: 'OPEN' } },
            receivedReviews: { where: { isPublic: true } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove sensitive data if not own profile and not admin
    if (session.user.id !== params.id && !PermissionService.canAccessUserManagement(session.user.role)) {
      const publicProfile = {
        id: user.id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        rating: user.rating,
        isVerified: user.isVerified,
        categories: user.categories,
        createdAt: user.createdAt,
        gigsAsFreelancer: user.gigsAsFreelancer,
        jobsAsHirer: user.jobsAsHirer,
        receivedReviews: user.receivedReviews,
        _count: user._count,
      }
      return NextResponse.json({ user: publicProfile })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get user profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!PermissionService.canAccessUserManagement(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Don't allow deleting own account
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete own account' },
        { status: 400 }
      )
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}