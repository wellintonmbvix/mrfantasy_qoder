-- AlterTable - Add discount fields to orders
ALTER TABLE `orders` 
ADD COLUMN `discount_type` ENUM('PERCENTAGE', 'FIXED'),
ADD COLUMN `discount_value` DECIMAL(10,2),
ADD COLUMN `subtotal_amount` DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable - Add discount fields to order_items
ALTER TABLE `order_items` 
ADD COLUMN `discount_type` ENUM('PERCENTAGE', 'FIXED'),
ADD COLUMN `discount_value` DECIMAL(10,2);

-- Update existing orders to set subtotal_amount equal to total_amount for backwards compatibility
UPDATE `orders` SET `subtotal_amount` = `total_amount`;