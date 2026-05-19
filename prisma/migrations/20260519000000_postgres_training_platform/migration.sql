-- Initial PostgreSQL schema for FORGE v1.1 training platform.

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "profileData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StationPR" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "timeMs" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StationPR_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Microcycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Microcycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalTimeMs" INTEGER NOT NULL,
    "blockLogs" TEXT NOT NULL,
    "rpe" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "raceDate" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "planLevel" TEXT NOT NULL,
    "currentWeekIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekIndex" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "volumeTarget" INTEGER NOT NULL,
    "readinessSnapshot" JSONB,
    "planAdjustments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingWeek_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduledWorkout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekId" TEXT,
    "date" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isSubstituted" BOOLEAN NOT NULL DEFAULT false,
    "workout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScheduledWorkout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "equipmentRequired" JSONB NOT NULL,
    "difficulty" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RacePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingPlanId" TEXT,
    "title" TEXT NOT NULL,
    "targetTimeMs" INTEGER NOT NULL,
    "division" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'Individual',
    "stationSplits" JSONB NOT NULL,
    "runSplits" JSONB NOT NULL,
    "roxzoneMs" INTEGER NOT NULL,
    "projectedTimeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RacePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReadinessSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "avgRpe" DOUBLE PRECISION,
    "maxRpe" DOUBLE PRECISION,
    "completedSessions" INTEGER NOT NULL,
    "painSignals" JSONB NOT NULL,
    "redFlagSignals" JSONB NOT NULL,
    "volumeMultiplier" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadinessSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingPlanId" TEXT,
    "generationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachGeneration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "StationPR_userId_station_key" ON "StationPR"("userId", "station");
CREATE UNIQUE INDEX "Microcycle_userId_key" ON "Microcycle"("userId");
CREATE UNIQUE INDEX "DailyLog_userId_date_key" ON "DailyLog"("userId", "date");
CREATE INDEX "TrainingPlan_userId_status_idx" ON "TrainingPlan"("userId", "status");
CREATE UNIQUE INDEX "TrainingWeek_planId_weekIndex_key" ON "TrainingWeek"("planId", "weekIndex");
CREATE INDEX "ScheduledWorkout_userId_date_idx" ON "ScheduledWorkout"("userId", "date");
CREATE INDEX "WorkoutTemplate_userId_focus_idx" ON "WorkoutTemplate"("userId", "focus");
CREATE INDEX "RacePlan_userId_createdAt_idx" ON "RacePlan"("userId", "createdAt");
CREATE INDEX "ReadinessSnapshot_userId_date_idx" ON "ReadinessSnapshot"("userId", "date");
CREATE INDEX "CoachGeneration_userId_createdAt_idx" ON "CoachGeneration"("userId", "createdAt");

ALTER TABLE "StationPR" ADD CONSTRAINT "StationPR_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Microcycle" ADD CONSTRAINT "Microcycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingWeek" ADD CONSTRAINT "TrainingWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledWorkout" ADD CONSTRAINT "ScheduledWorkout_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "TrainingWeek"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RacePlan" ADD CONSTRAINT "RacePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RacePlan" ADD CONSTRAINT "RacePlan_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReadinessSnapshot" ADD CONSTRAINT "ReadinessSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachGeneration" ADD CONSTRAINT "CoachGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachGeneration" ADD CONSTRAINT "CoachGeneration_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
