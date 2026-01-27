/*
  Warnings:

  - You are about to drop the column `systemRole` on the `user_invitations` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `user_locations` table. All the data in the column will be lost.
  - You are about to drop the column `systemRole` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'SALESPERSON', 'STAFF');

-- AlterTable
ALTER TABLE "user_invitations" DROP COLUMN "systemRole",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STAFF';

-- AlterTable
ALTER TABLE "user_locations" DROP COLUMN "role",
ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "systemRole",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STAFF';

-- DropEnum
DROP TYPE "LocationRole";

-- DropEnum
DROP TYPE "SystemRole";
