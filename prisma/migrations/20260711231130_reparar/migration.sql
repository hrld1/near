-- CreateTable
CREATE TABLE "Repair" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairEntry" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feelings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "perspective" TEXT NOT NULL,
    "need" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Repair_coupleId_createdAt_idx" ON "Repair"("coupleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepairEntry_repairId_userId_key" ON "RepairEntry"("repairId", "userId");

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEntry" ADD CONSTRAINT "RepairEntry_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "Repair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEntry" ADD CONSTRAINT "RepairEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
