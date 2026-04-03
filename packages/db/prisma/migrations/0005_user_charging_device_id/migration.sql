-- AlterTable
ALTER TABLE "User" ADD COLUMN "chargingDeviceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_chargingDeviceId_key" ON "User"("chargingDeviceId");
