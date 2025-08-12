import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const userType = searchParams.get('userType') || 'all'; // all, freelancer, hirer

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // User role check for access levels
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = currentUser?.role === 'ADMIN';
    const userId = session.user.id;

    // Build analytics based on user role and requested type
    let analytics: any = {};

    if (isAdmin && userType === 'all') {
      // Platform-wide analytics for admins
      analytics = await getPlatformAnalytics(startDate);
    } else {
      // User-specific analytics
      analytics = await getUserAnalytics(userId, startDate, currentUser?.role || 'FREELANCER');
    }

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

async function getPlatformAnalytics(startDate: Date) {
  // Platform overview stats
  const totalUsers = await prisma.user.count();
  const newUsers = await prisma.user.count({
    where: { createdAt: { gte: startDate } },
  });

  const totalJobs = await prisma.job.count();
  const newJobs = await prisma.job.count({
    where: { createdAt: { gte: startDate } },
  });

  const totalGigs = await prisma.gig.count();
  const newGigs = await prisma.gig.count({
    where: { createdAt: { gte: startDate } },
  });

  // Revenue analytics
  const payments = await prisma.payment.findMany({
    where: {
      status: 'RELEASED',
      createdAt: { gte: startDate },
    },
    select: { amount: true, createdAt: true },
  });

  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

  // Daily revenue trend
  const dailyRevenue = await prisma.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      SUM(amount) as revenue,
      COUNT(*) as transactions
    FROM payments 
    WHERE status = 'RELEASED' 
      AND created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  // Category performance
  const categoryStats = await prisma.category.findMany({
    include: {
      jobs: {
        where: { createdAt: { gte: startDate } },
        select: { budget: true },
      },
      gigs: {
        where: { createdAt: { gte: startDate } },
        select: { orderCount: true },
      },
    },
  });

  const categoryAnalytics = categoryStats.map(category => ({
    name: category.name,
    jobCount: category.jobs.length,
    totalBudget: category.jobs.reduce((sum, job) => sum + job.budget, 0),
    gigCount: category.gigs.length,
    totalOrders: category.gigs.reduce((sum, gig) => sum + gig.orderCount, 0),
  }));

  // User growth trend
  const userGrowth = await prisma.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as new_users,
      SUM(CASE WHEN role = 'FREELANCER' THEN 1 ELSE 0 END) as freelancers,
      SUM(CASE WHEN role = 'HIRER' THEN 1 ELSE 0 END) as hirers
    FROM users 
    WHERE created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  // Top performers
  const topFreelancers = await prisma.user.findMany({
    where: {
      role: 'FREELANCER',
      totalEarned: { gt: 0 },
    },
    orderBy: { totalEarned: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      username: true,
      totalEarned: true,
      rating: true,
    },
  });

  const topHirers = await prisma.user.findMany({
    where: {
      role: 'HIRER',
      totalSpent: { gt: 0 },
    },
    orderBy: { totalSpent: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      username: true,
      totalSpent: true,
      rating: true,
    },
  });

  return {
    overview: {
      totalUsers,
      newUsers,
      totalJobs,
      newJobs,
      totalGigs,
      newGigs,
      totalRevenue,
      totalTransactions: payments.length,
    },
    trends: {
      dailyRevenue,
      userGrowth,
      categoryAnalytics,
    },
    leaderboards: {
      topFreelancers,
      topHirers,
    },
  };

async function getUserAnalytics(userId: string, startDate: Date, userRole: string) {
  if (userRole === 'FREELANCER') {
    return await getFreelancerAnalytics(userId, startDate);
  } else if (userRole === 'HIRER') {
    return await getHirerAnalytics(userId, startDate);
  }
  
  return {};

async function getFreelancerAnalytics(freelancerId: string, startDate: Date) {
  // Earnings and job stats
  const earnings = await prisma.payment.findMany({
    where: {
      toUserId: freelancerId,
      status: 'RELEASED',
      createdAt: { gte: startDate },
    },
    select: { amount: true, createdAt: true },
  });

  const totalEarnings = earnings.reduce((sum, payment) => sum + payment.amount, 0);

  // Job applications and success rate
  const applications = await prisma.jobApplication.findMany({
    where: {
      freelancerId,
      createdAt: { gte: startDate },
    },
    select: { isAccepted: true, createdAt: true },
  });

  const acceptedApplications = applications.filter(app => app.isAccepted === true);
  const successRate = applications.length > 0 ? (acceptedApplications.length / applications.length) * 100 : 0;

  // Gig performance
  const gigs = await prisma.gig.findMany({
    where: {
      freelancerId,
    },
    select: {
      id: true,
      title: true,
      orderCount: true,
      viewCount: true,
      rating: true,
      createdAt: true,
    },
  });

  // Daily earnings trend
  const dailyEarnings = await prisma.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      SUM(amount) as earnings
    FROM payments 
    WHERE to_user_id = ${freelancerId}
      AND status = 'RELEASED' 
      AND created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  // Category performance
  const categoryPerformance = await prisma.$queryRaw`
    SELECT 
      c.name as category,
      COUNT(j.id) as job_count,
      SUM(p.amount) as total_earned
    FROM categories c
    JOIN jobs j ON j.category_id = c.id
    JOIN job_applications ja ON ja.job_id = j.id
    LEFT JOIN payments p ON p.job_id = j.id AND p.to_user_id = ${freelancerId} AND p.status = 'RELEASED'
    WHERE ja.freelancer_id = ${freelancerId}
      AND ja.is_accepted = true
      AND j.created_at >= ${startDate}
    GROUP BY c.id, c.name
    ORDER BY total_earned DESC
  `;

  return {
    overview: {
      totalEarnings,
      totalJobs: acceptedApplications.length,
      totalApplications: applications.length,
      successRate: Math.round(successRate),
      totalGigs: gigs.length,
      totalOrders: gigs.reduce((sum, gig) => sum + gig.orderCount, 0),
    },
    trends: {
      dailyEarnings,
      categoryPerformance,
    },
    gigs: gigs.slice(0, 5), // Top 5 gigs
  };

async function getHirerAnalytics(hirerId: string, startDate: Date) {
  // Spending and project stats
  const payments = await prisma.payment.findMany({
    where: {
      fromUserId: hirerId,
      status: 'RELEASED',
      createdAt: { gte: startDate },
    },
    select: { amount: true, createdAt: true },
  });

  const totalSpent = payments.reduce((sum, payment) => sum + payment.amount, 0);

  // Posted jobs
  const jobs = await prisma.job.findMany({
    where: {
      hirerId,
      createdAt: { gte: startDate },
    },
    include: {
      applications: true,
      category: true,
    },
  });

  const completedJobs = jobs.filter(job => job.status === 'COMPLETED');
  const activeJobs = jobs.filter(job => job.status === 'IN_PROGRESS');

  // Daily spending trend
  const dailySpending = await prisma.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      SUM(amount) as spent
    FROM payments 
    WHERE from_user_id = ${hirerId}
      AND status = 'RELEASED' 
      AND created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  // Category spending
  const categorySpending = await prisma.$queryRaw`
    SELECT 
      c.name as category,
      COUNT(j.id) as job_count,
      SUM(j.budget) as total_budget,
      SUM(p.amount) as total_spent
    FROM categories c
    JOIN jobs j ON j.category_id = c.id
    LEFT JOIN payments p ON p.job_id = j.id AND p.from_user_id = ${hirerId} AND p.status = 'RELEASED'
    WHERE j.hirer_id = ${hirerId}
      AND j.created_at >= ${startDate}
    GROUP BY c.id, c.name
    ORDER BY total_spent DESC
  `;

  return {
    overview: {
      totalSpent,
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      activeJobs: activeJobs.length,
      averageJobBudget: jobs.length > 0 ? jobs.reduce((sum, job) => sum + job.budget, 0) / jobs.length : 0,
    },
    trends: {
      dailySpending,
      categorySpending,
    },
    recentJobs: jobs.slice(0, 5), // Most recent 5 jobs
  };
}
