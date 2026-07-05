-- CreateEnum
CREATE TYPE "LetterKind" AS ENUM ('SLOW', 'CAPSULE');

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "prep" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "city" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DailyPhoto" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "LetterKind" NOT NULL DEFAULT 'SLOW',
    "body" TEXT NOT NULL,
    "deliverAt" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "pushSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotifyAccount" (
    "userId" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "product" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotifyAccount_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "DailyPhoto_coupleId_createdAt_idx" ON "DailyPhoto"("coupleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPhoto_userId_dateKey_key" ON "DailyPhoto"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "Letter_coupleId_deliverAt_idx" ON "Letter"("coupleId", "deliverAt");

-- AddForeignKey
ALTER TABLE "DailyPhoto" ADD CONSTRAINT "DailyPhoto_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPhoto" ADD CONSTRAINT "DailyPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotifyAccount" ADD CONSTRAINT "SpotifyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
