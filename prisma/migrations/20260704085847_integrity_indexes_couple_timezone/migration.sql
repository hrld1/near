-- AlterTable
ALTER TABLE "Couple" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid';

-- CreateIndex
CREATE INDEX "AchievementUnlock_coupleId_idx" ON "AchievementUnlock"("coupleId");

-- CreateIndex
CREATE INDEX "DailyBox_openedById_idx" ON "DailyBox"("openedById");

-- CreateIndex
CREATE INDEX "GameScore_userId_gameKey_dateKey_idx" ON "GameScore"("userId", "gameKey", "dateKey");

-- CreateIndex
CREATE INDEX "Invite_inviterId_idx" ON "Invite"("inviterId");

-- CreateIndex
CREATE INDEX "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "User_coupleId_idx" ON "User"("coupleId");

-- AddForeignKey
ALTER TABLE "DailyBox" ADD CONSTRAINT "DailyBox_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementUnlock" ADD CONSTRAINT "AchievementUnlock_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
