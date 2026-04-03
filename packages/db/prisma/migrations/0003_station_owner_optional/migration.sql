-- Optional station owner: unassigned stations allowed
ALTER TABLE "Station" DROP CONSTRAINT IF EXISTS "Station_ownerId_fkey";

ALTER TABLE "Station" ALTER COLUMN "ownerId" DROP NOT NULL;

ALTER TABLE "Station" ADD CONSTRAINT "Station_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
