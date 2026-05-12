/*
  Warnings:

  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill: give existing NULL-name rows a placeholder derived from their email
UPDATE "User" SET name = split_part(email, '@', 1) WHERE name IS NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
