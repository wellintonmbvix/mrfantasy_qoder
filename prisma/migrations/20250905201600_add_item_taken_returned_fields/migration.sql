-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `item_returned` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `item_taken` BOOLEAN NOT NULL DEFAULT false;
