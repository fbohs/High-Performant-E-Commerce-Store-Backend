/*
  Warnings:

  - Made the column `phone` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill: give existing NULL-phone rows a unique placeholder derived from their publicId
UPDATE "User" SET phone = 'unknown_' || "publicId"::text WHERE phone IS NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;
