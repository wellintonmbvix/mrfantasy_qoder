/*
  Warnings:

  - Added the required column `city` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `neighborhood` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `number` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zip_code` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cost_price` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `customers` ADD COLUMN `city` VARCHAR(191) NOT NULL,
    ADD COLUMN `complement` VARCHAR(191) NULL,
    ADD COLUMN `neighborhood` VARCHAR(191) NOT NULL,
    ADD COLUMN `number` VARCHAR(191) NOT NULL,
    ADD COLUMN `phone_2` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NOT NULL,
    ADD COLUMN `zip_code` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `cost_price` DECIMAL(10, 2) NOT NULL;

-- CreateTable
CREATE TABLE `company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `razao_social` VARCHAR(191) NOT NULL,
    `nome_fantasia` VARCHAR(191) NOT NULL,
    `endereco` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `complemento` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NOT NULL,
    `cidade` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `cep` VARCHAR(191) NOT NULL,
    `telefone_1` VARCHAR(191) NOT NULL,
    `telefone_2` VARCHAR(191) NULL,
    `cnpj` VARCHAR(191) NOT NULL,
    `inscricao_estadual` VARCHAR(191) NULL,
    `observacao_aluguel` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
