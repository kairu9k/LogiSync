-- Add notes field to shipments table
-- This allows adding custom messages when creating shipments

ALTER TABLE `shipments`
ADD COLUMN `notes` TEXT NULL COMMENT 'Custom message/notes for the shipment'
AFTER `charges`;
