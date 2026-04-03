-- Add passwordHash for credentials-based authentication
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

