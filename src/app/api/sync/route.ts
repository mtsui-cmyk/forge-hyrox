import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { normalizeTrainingPlan } from '@/lib/trainingPlan';
import { scheduledWorkoutsFromMicrocycle } from '@/lib/scheduledWorkout';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { profileData, microcycle, completedLogs, longTermPlan, scheduledWorkouts, workoutTemplates, racePlans, readinessSnapshot, coachGeneration } = body;

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

      for (const scheduledWorkout of scheduledWorkoutsFromMicrocycle(
        normalizedMicrocycle,
      )) {
        await prisma.scheduledWorkout.upsert({
          where: { id: scheduledWorkout.id },
          update: {
            date: scheduledWorkout.date,
            source: scheduledWorkout.source,
            isCompleted: !!completedLogs?.[scheduledWorkout.date],
            isSubstituted: scheduledWorkout.isSubstituted,
            workout: scheduledWorkout.workout,
          },
          create: {
            id: scheduledWorkout.id,
            userId: session.user.id,
            date: scheduledWorkout.date,
            source: scheduledWorkout.source,
            isCompleted: !!completedLogs?.[scheduledWorkout.date],
            isSubstituted: scheduledWorkout.isSubstituted,
            workout: scheduledWorkout.workout,
          }
        });
      }
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

    if (longTermPlan) {
      const persistedPlan = await prisma.trainingPlan.upsert({
        where: { id: longTermPlan.id || `active-${session.user.id}` },
        update: {
          title: longTermPlan.title,
          startDate: longTermPlan.startDate,
          endDate: longTermPlan.endDate,
          raceDate: longTermPlan.raceDate,
          goal: longTermPlan.goal,
          status: longTermPlan.status || 'active',
          planLevel: longTermPlan.planLevel,
          currentWeekIndex: longTermPlan.currentWeekIndex || 0,
        },
        create: {
          id: longTermPlan.id || `active-${session.user.id}`,
          userId: session.user.id,
          title: longTermPlan.title,
          startDate: longTermPlan.startDate,
          endDate: longTermPlan.endDate,
          raceDate: longTermPlan.raceDate,
          goal: longTermPlan.goal,
          status: longTermPlan.status || 'active',
          planLevel: longTermPlan.planLevel,
          currentWeekIndex: longTermPlan.currentWeekIndex || 0,
        }
      });

      if (Array.isArray(longTermPlan.weeks)) {
        const incomingWeekIndexes = longTermPlan.weeks.map((week: any) => week.weekIndex);
        await prisma.trainingWeek.deleteMany({
          where: {
            planId: persistedPlan.id,
            weekIndex: { notIn: incomingWeekIndexes },
          }
        });
        for (const week of longTermPlan.weeks) {
          await prisma.trainingWeek.upsert({
            where: {
              planId_weekIndex: {
                planId: persistedPlan.id,
                weekIndex: week.weekIndex,
              }
            },
            update: {
              phase: week.phase,
              startDate: week.startDate,
              focus: week.focus,
              volumeTarget: week.volumeTarget,
              readinessSnapshot: week.readinessSnapshot || undefined,
              planAdjustments: week.planAdjustments || [],
            },
            create: {
              planId: persistedPlan.id,
              weekIndex: week.weekIndex,
              startDate: week.startDate,
              phase: week.phase,
              focus: week.focus,
              volumeTarget: week.volumeTarget,
              readinessSnapshot: week.readinessSnapshot || undefined,
              planAdjustments: week.planAdjustments || [],
            }
          });
        }
      }
    }

    if (Array.isArray(scheduledWorkouts)) {
      for (const scheduledWorkout of scheduledWorkouts) {
        await prisma.scheduledWorkout.upsert({
          where: { id: scheduledWorkout.id },
          update: {
            date: scheduledWorkout.date,
            source: scheduledWorkout.source,
            isCompleted: !!scheduledWorkout.isCompleted,
            isSubstituted: !!scheduledWorkout.isSubstituted,
            workout: scheduledWorkout.workout,
          },
          create: {
            id: scheduledWorkout.id,
            userId: session.user.id,
            date: scheduledWorkout.date,
            source: scheduledWorkout.source,
            isCompleted: !!scheduledWorkout.isCompleted,
            isSubstituted: !!scheduledWorkout.isSubstituted,
            workout: scheduledWorkout.workout,
          }
        });
      }
    }

    if (Array.isArray(workoutTemplates)) {
      for (const template of workoutTemplates) {
        await prisma.workoutTemplate.upsert({
          where: { id: template.id },
          update: {
            title: template.title,
            focus: template.focus,
            duration: template.duration,
            equipmentRequired: template.equipmentRequired || [],
            difficulty: template.difficulty,
            blocks: template.blocks || [],
            isFavorite: !!template.isFavorite,
            isBuiltIn: !!template.isBuiltIn,
          },
          create: {
            id: template.id,
            userId: template.isBuiltIn ? null : session.user.id,
            title: template.title,
            focus: template.focus,
            duration: template.duration,
            equipmentRequired: template.equipmentRequired || [],
            difficulty: template.difficulty,
            blocks: template.blocks || [],
            isFavorite: !!template.isFavorite,
            isBuiltIn: !!template.isBuiltIn,
          }
        });
      }
    }

    if (Array.isArray(racePlans)) {
      for (const racePlan of racePlans) {
        await prisma.racePlan.create({
          data: {
            userId: session.user.id,
            title: racePlan.title,
            targetTimeMs: racePlan.targetTimeMs,
            division: racePlan.division,
            gender: racePlan.gender,
            eventType: racePlan.eventType || 'Individual',
            stationSplits: racePlan.stationSplits,
            runSplits: racePlan.runSplits,
            roxzoneMs: racePlan.roxzoneMs,
            projectedTimeMs: racePlan.projectedTimeMs,
          }
        });
      }
    }

    if (readinessSnapshot) {
      await prisma.readinessSnapshot.create({
        data: {
          userId: session.user.id,
          date: readinessSnapshot.date,
          level: readinessSnapshot.level,
          avgRpe: readinessSnapshot.avgRpe ?? null,
          maxRpe: readinessSnapshot.maxRpe ?? null,
          completedSessions: readinessSnapshot.completedSessions,
          painSignals: readinessSnapshot.painSignals || [],
          redFlagSignals: readinessSnapshot.redFlagSignals || [],
          volumeMultiplier: readinessSnapshot.volumeMultiplier,
        }
      });
    }

    if (coachGeneration) {
      await prisma.coachGeneration.create({
        data: {
          userId: session.user.id,
          generationType: coachGeneration.generationType,
          status: coachGeneration.status,
          fallbackUsed: !!coachGeneration.fallbackUsed,
          failureReason: coachGeneration.failureReason || null,
          metadata: coachGeneration.metadata || {},
        }
      });
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
      include: {
        microcycle: true,
        dailyLogs: true,
        stationPRs: true,
        trainingPlans: { where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 1, include: { weeks: true } },
        scheduledWorkouts: { orderBy: { date: 'asc' }, take: 60 },
        workoutTemplates: true,
        racePlans: { orderBy: { createdAt: 'desc' }, take: 5 },
        readinessSnapshots: { orderBy: { createdAt: 'desc' }, take: 10 },
        coachGenerations: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
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
      prs: prsObj,
      longTermPlan: user.trainingPlans[0] || null,
      scheduledWorkouts: user.scheduledWorkouts,
      workoutTemplates: user.workoutTemplates,
      racePlans: user.racePlans,
      readinessSnapshots: user.readinessSnapshots,
      coachGenerations: user.coachGenerations
    });
  } catch (error) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
