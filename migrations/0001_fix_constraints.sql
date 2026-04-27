-- Migration: Fix FK cascade, set Food.foodId AUTO_INCREMENT, add mustChangePassword
-- Run these statements against your MySQL database as an admin user.

-- 1) Make Preferences.userId cascade on delete
ALTER TABLE `Preferences`
  DROP FOREIGN KEY `Preferences_ibfk_1`;

ALTER TABLE `Preferences`
  ADD CONSTRAINT `Preferences_ibfk_1`
  FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`)
  ON DELETE CASCADE;

-- 2) Make Food.foodId AUTO_INCREMENT (preserves PK)
ALTER TABLE `Food`
  MODIFY `foodId` INT NOT NULL AUTO_INCREMENT;

-- 3) Add mustChangePassword to Users for admin-provisioned sellers
ALTER TABLE `Users`
  ADD COLUMN IF NOT EXISTS `mustChangePassword` TINYINT(1) NOT NULL DEFAULT 0;

-- Note: If any constraint names differ in your DB, adjust them accordingly.
