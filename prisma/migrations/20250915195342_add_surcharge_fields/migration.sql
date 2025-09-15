-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `surcharge_type` ENUM('PERCENTAGE', 'FIXED') NULL,
    ADD COLUMN `surcharge_value` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `surcharge_type` ENUM('PERCENTAGE', 'FIXED') NULL,
    ADD COLUMN `surcharge_value` DECIMAL(10, 2) NULL;
