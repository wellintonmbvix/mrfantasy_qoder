-- AlterTable
ALTER TABLE `orders` ADD COLUMN `attendant_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_attendant_id_fkey` FOREIGN KEY (`attendant_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
