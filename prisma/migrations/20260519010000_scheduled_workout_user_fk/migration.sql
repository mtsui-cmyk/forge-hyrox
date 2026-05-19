ALTER TABLE "ScheduledWorkout"
ADD CONSTRAINT "ScheduledWorkout_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
