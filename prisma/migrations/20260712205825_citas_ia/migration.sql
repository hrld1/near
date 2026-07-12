-- CreateTable
CREATE TABLE "DatePlan" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT,
    "planDate" TIMESTAMP(3),
    "budget" TEXT,
    "steps" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPUESTA',
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatePlan_coupleId_createdAt_idx" ON "DatePlan"("coupleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_coupleId_dateKey_key" ON "AiUsage"("coupleId", "dateKey");

-- AddForeignKey
ALTER TABLE "DatePlan" ADD CONSTRAINT "DatePlan_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatePlan" ADD CONSTRAINT "DatePlan_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
