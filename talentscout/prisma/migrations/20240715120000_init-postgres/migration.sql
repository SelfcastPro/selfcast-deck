-- CreateEnum
CREATE TYPE "Status" AS ENUM ('NEW', 'CONTACTED', 'REPLIED', 'SIGNED_UP', 'NOT_INTERESTED');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT,
    "bio" TEXT,
    "profileUrl" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "followers" INTEGER,
    "sourceHashtag" TEXT,
    "country" TEXT,
    "status" "Status" NOT NULL DEFAULT 'NEW',
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "scoutName" TEXT,
    "message" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'instagram_dm',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- AddForeignKey
ALTER TABLE "ContactLog" ADD CONSTRAINT "ContactLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

