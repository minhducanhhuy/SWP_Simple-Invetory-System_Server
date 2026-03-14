/*
  Warnings:

  - The values [SELL,TRANSFER,ADJUSTMENT,RETURN_TO_SUPP,RETURN_FROM_CUST] on the enum `TicketType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReasonCode" ADD VALUE 'BUY';
ALTER TYPE "ReasonCode" ADD VALUE 'SELL';
ALTER TYPE "ReasonCode" ADD VALUE 'TRANSFER';
ALTER TYPE "ReasonCode" ADD VALUE 'ADJUSTMENT';
ALTER TYPE "ReasonCode" ADD VALUE 'RETURN_TO_SUPP';
ALTER TYPE "ReasonCode" ADD VALUE 'RETURN_FROM_CUST';

-- AlterEnum
BEGIN;
CREATE TYPE "TicketType_new" AS ENUM ('IMPORT', 'EXPORT');
ALTER TABLE "stock_tickets" ALTER COLUMN "type" TYPE "TicketType_new" USING ("type"::text::"TicketType_new");
ALTER TYPE "TicketType" RENAME TO "TicketType_old";
ALTER TYPE "TicketType_new" RENAME TO "TicketType";
DROP TYPE "TicketType_old";
COMMIT;
