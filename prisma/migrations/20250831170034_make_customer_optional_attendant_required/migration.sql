-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_customer_id_fkey`;

-- AlterTable
ALTER TABLE `orders` MODIFY `customer_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
