-- CreateTable
CREATE TABLE "Appreciation" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appreciation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardAnswer" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPulse" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyPulse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appreciation_coupleId_createdAt_idx" ON "Appreciation"("coupleId", "createdAt");

-- CreateIndex
CREATE INDEX "CardAnswer_coupleId_cardId_idx" ON "CardAnswer"("coupleId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "CardAnswer_userId_cardId_key" ON "CardAnswer"("userId", "cardId");

-- CreateIndex
CREATE INDEX "WeeklyPulse_coupleId_weekKey_idx" ON "WeeklyPulse"("coupleId", "weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPulse_userId_weekKey_key" ON "WeeklyPulse"("userId", "weekKey");

-- AddForeignKey
ALTER TABLE "Appreciation" ADD CONSTRAINT "Appreciation_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appreciation" ADD CONSTRAINT "Appreciation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAnswer" ADD CONSTRAINT "CardAnswer_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAnswer" ADD CONSTRAINT "CardAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPulse" ADD CONSTRAINT "WeeklyPulse_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPulse" ADD CONSTRAINT "WeeklyPulse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
