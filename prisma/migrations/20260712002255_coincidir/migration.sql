-- CreateTable
CREATE TABLE "FreeSlot" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FreeSlot_coupleId_startsAt_idx" ON "FreeSlot"("coupleId", "startsAt");

-- AddForeignKey
ALTER TABLE "FreeSlot" ADD CONSTRAINT "FreeSlot_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeSlot" ADD CONSTRAINT "FreeSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
