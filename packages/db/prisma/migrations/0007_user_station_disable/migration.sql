-- CreateEnum
CREATE TYPE "StationDisabledBy" AS ENUM ('owner', 'admin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Station" ADD COLUMN "disabledAt" TIMESTAMP(3),
ADD COLUMN "disabledBy" "StationDisabledBy";
