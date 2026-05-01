import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { normalizeTrainingPlan } from '@/lib/trainingPlan';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { profileData, microcycle, completedLogs } = body;

    if (profileData) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { profileData: JSON.stringify(profileData) }
      });
    }

    if (microcycle) {
      const normalizedMicrocycle = normalizeTrainingPlan(microcycle);
      await prisma.microcycle.upsert({
        where: { userId: session.user.id },
        update: { data: JSON.stringify(normalizedMicrocycle) },
        create: {
          userId: session.user.id,
          data: JSON.stringify(normalizedMicrocycle)
        }
      });
    }

    if (completedLogs) {
      for (const [date, log] of Object.entries(completedLogs as Record<string, any>)) {
        await prisma.dailyLog.upsert({
          where: {
            userId_date: {
              userId: session.user.id,
              date: date
            }
          },
          update: {
            totalTimeMs: log.totalTimeMs,
            blockLogs: JSON.stringify(log.blockLogs),
            rpe: typeof log.rpe === 'number' ? log.rpe : null,
            completedAt: new Date(log.completedAt)
          },
          create: {
            userId: session.user.id,
            date: date,
            totalTimeMs: log.totalTimeMs,
            blockLogs: JSON.stringify(log.blockLogs),
            rpe: typeof log.rpe === 'number' ? log.rpe : null,
            completedAt: new Date(log.completedAt)
          }
        });
      }
    }

    const { prs } = body;
    if (prs) {
      for (const [station, timeMs] of Object.entries(prs as Record<string, number>)) {
        await prisma.stationPR.upsert({
          where: {
            userId_station: {
              userId: session.user.id,
              station: station
            }
          },
          update: {
            timeMs: timeMs
          },
          create: {
            userId: session.user.id,
            station: station,
            timeMs: timeMs
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { microcycle: true, dailyLogs: true, stationPRs: true }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const formattedLogs: Record<string, unknown> = {};
    user.dailyLogs.forEach((log: { date: string; totalTimeMs: number; blockLogs: string; rpe: number | null; completedAt: Date }) => {
      formattedLogs[log.date] = {
        date: log.date,
        totalTimeMs: log.totalTimeMs,
        blockLogs: JSON.parse(log.blockLogs),
        rpe: log.rpe ?? undefined,
        completedAt: log.completedAt.toISOString()
      };
    });

    const prsObj: Record<string, number> = {};
    user.stationPRs.forEach((pr: { station: string; timeMs: number }) => {
      prsObj[pr.station] = pr.timeMs;
    });

    return NextResponse.json({
      profileData: user.profileData ? JSON.parse(user.profileData) : null,
      microcycle: user.microcycle ? normalizeTrainingPlan(JSON.parse(user.microcycle.data)) : null,
      completedLogs: formattedLogs,
      prs: prsObj
    });
  } catch (error) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
