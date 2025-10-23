-- LogiSync Database Schema
-- Updated: 2025-01-23
-- Based on consolidated Laravel migrations

-- ==========================================
-- 1. ORGANIZATIONS TABLE
-- ==========================================
CREATE TABLE `organizations` (
  `organization_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 2. USERS TABLE
-- ==========================================
CREATE TABLE `users` (
  `user_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verification_code` varchar(6) DEFAULT NULL,
  `email_verification_code_expires_at` timestamp NULL DEFAULT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role` (`role`),
  KEY `organization_id` (`organization_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `fk_users_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`organization_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 3. SUBSCRIPTIONS TABLE
-- ==========================================
CREATE TABLE `subscriptions` (
  `subscription_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `plan_name` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `price` int(11) NOT NULL,
  `term_months` int(11) NOT NULL,
  `paymongo_payment_link_id` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`subscription_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 4. WAREHOUSE TABLE
-- ==========================================
CREATE TABLE `warehouse` (
  `warehouse_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `warehouse_name` varchar(255) NOT NULL,
  `location` text NOT NULL,
  PRIMARY KEY (`warehouse_id`),
  KEY `warehouse_name` (`warehouse_name`),
  KEY `organization_id` (`organization_id`),
  CONSTRAINT `fk_warehouse_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`organization_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 5. BUDGETS TABLE
-- ==========================================
CREATE TABLE `budgets` (
  `budget_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `budget_name` varchar(255) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_budget` int(11) NOT NULL,
  PRIMARY KEY (`budget_id`),
  KEY `budget_name` (`budget_name`),
  KEY `start_date` (`start_date`),
  KEY `organization_id` (`organization_id`),
  CONSTRAINT `fk_budgets_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`organization_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 6. SCHEDULES TABLE
-- ==========================================
CREATE TABLE `schedules` (
  `schedule_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `schedule_name` varchar(255) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `route_details` text DEFAULT NULL,
  PRIMARY KEY (`schedule_id`),
  KEY `schedule_name` (`schedule_name`),
  KEY `start_time` (`start_time`),
  KEY `organization_id` (`organization_id`),
  CONSTRAINT `fk_schedules_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`organization_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 7. QUOTES TABLE
-- ==========================================
CREATE TABLE `quotes` (
  `quote_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `quote_number` varchar(20) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `created_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `creation_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `weight` int(11) NOT NULL,
  `dimensions` varchar(255) NOT NULL,
  `estimated_cost` int(11) NOT NULL,
  `expiry_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `distance` int(11) NOT NULL,
  PRIMARY KEY (`quote_id`),
  UNIQUE KEY `quote_number` (`quote_number`),
  KEY `organization_id` (`organization_id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `status` (`status`),
  KEY `creation_date` (`creation_date`),
  CONSTRAINT `fk_quotes_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`organization_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotes_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 8. ORDERS TABLE
-- ==========================================
CREATE TABLE `orders` (
  `order_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `quote_id` int(10) UNSIGNED DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `order_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `order_status` varchar(50) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `organization_id` (`organization_id`),
  KEY `quote_id` (`quote_id`),
  KEY `order_status` (`order_status`),
  KEY `order_date` (`order_date`),
  CONSTRAINT `fk_orders_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`organization_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orders_quote` FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`quote_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 9. TRANSPORT TABLE
-- ==========================================
CREATE TABLE `transport` (
  `transport_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `vehicle_id` varchar(255) NOT NULL,
  `vehicle_type` varchar(255) NOT NULL,
  `registration_number` varchar(255) NOT NULL,
  `capacity` varchar(255) NOT NULL,
  `safety_compliance_details` text DEFAULT NULL,
  `driver_id` int(10) UNSIGNED NOT NULL,
  `budget_id` int(10) UNSIGNED NOT NULL,
  `schedule_id` int(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`transport_id`),
  UNIQUE KEY `registration_number` (`registration_number`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `driver_id` (`driver_id`),
  KEY `budget_id` (`budget_id`),
  KEY `schedule_id` (`schedule_id`),
  KEY `organization_id` (`organization_id`),
  CONSTRAINT `fk_transport_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`organization_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transport_driver` FOREIGN KEY (`driver_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transport_budget` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`budget_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transport_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`schedule_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 10. SHIPMENTS TABLE (includes receiver_email)
-- ==========================================
CREATE TABLE `shipments` (
  `shipment_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tracking_number` varchar(255) NOT NULL,
  `receiver_name` varchar(255) NOT NULL,
  `receiver_contact` varchar(50) DEFAULT NULL,
  `receiver_email` varchar(255) DEFAULT NULL,
  `receiver_address` text NOT NULL,
  `origin_name` varchar(255) NOT NULL,
  `origin_address` text NOT NULL,
  `destination_name` varchar(255) NOT NULL,
  `destination_address` text NOT NULL,
  `creation_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `charges` int(11) NOT NULL COMMENT 'Stored in centavos (e.g., 33600 = ₱336.00)',
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `departure_date` date DEFAULT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `transport_id` int(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`shipment_id`),
  UNIQUE KEY `tracking_number` (`tracking_number`),
  KEY `order_id` (`order_id`),
  KEY `transport_id` (`transport_id`),
  KEY `status` (`status`),
  KEY `creation_date` (`creation_date`),
  CONSTRAINT `fk_shipments_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_shipments_transport` FOREIGN KEY (`transport_id`) REFERENCES `transport`(`transport_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 11. INVOICES TABLE
-- ==========================================
CREATE TABLE `invoices` (
  `invoice_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(20) DEFAULT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `shipment_id` int(10) UNSIGNED DEFAULT NULL,
  `quote_id` int(10) UNSIGNED DEFAULT NULL,
  `invoice_type` varchar(255) NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `amount` int(11) NOT NULL COMMENT 'Stored in centavos (e.g., 33600 = ₱336.00)',
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `payment_date` date DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`invoice_id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `order_id` (`order_id`),
  KEY `shipment_id` (`shipment_id`),
  KEY `quote_id` (`quote_id`),
  KEY `status` (`status`),
  KEY `invoice_date` (`invoice_date`),
  KEY `due_date` (`due_date`),
  CONSTRAINT `fk_invoices_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`shipment_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 12. ORDER_DETAILS TABLE
-- ==========================================
CREATE TABLE `order_details` (
  `order_details_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  PRIMARY KEY (`order_details_id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `fk_order_details_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 13. INVENTORY TABLE
-- ==========================================
CREATE TABLE `inventory` (
  `inventory_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(10) UNSIGNED NOT NULL,
  `location_in_warehouse` varchar(255) NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`inventory_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `fk_inventory_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`warehouse_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 14. TRACKING_HISTORY TABLE
-- ==========================================
CREATE TABLE `tracking_history` (
  `tracking_history_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `shipment_id` int(10) UNSIGNED NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `location` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL,
  `details` text DEFAULT NULL,
  PRIMARY KEY (`tracking_history_id`),
  KEY `shipment_id` (`shipment_id`),
  KEY `timestamp` (`timestamp`),
  KEY `status` (`status`),
  CONSTRAINT `fk_tracking_history_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`shipment_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 15. USER_SUBSCRIPTIONS TABLE
-- ==========================================
CREATE TABLE `user_subscriptions` (
  `user_subscription_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int(10) UNSIGNED NOT NULL,
  `subscription_id` int(10) UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`user_subscription_id`),
  KEY `user_id` (`user_id`),
  KEY `subscription_id` (`subscription_id`),
  KEY `status` (`status`),
  CONSTRAINT `fk_user_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_subscriptions_plan` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`subscription_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 16. GPS_LOCATIONS TABLE
-- ==========================================
CREATE TABLE `gps_locations` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `shipment_id` int(10) UNSIGNED NOT NULL,
  `driver_id` int(10) UNSIGNED NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `speed` decimal(8,2) DEFAULT NULL,
  `accuracy` decimal(8,2) DEFAULT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipment_id_recorded_at` (`shipment_id`, `recorded_at`),
  CONSTRAINT `fk_gps_locations_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`shipment_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gps_locations_driver` FOREIGN KEY (`driver_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 17. PRICING_CONFIG TABLE (with default data)
-- ==========================================
CREATE TABLE `pricing_config` (
  `config_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `base_rate` decimal(10,2) NOT NULL DEFAULT 100.00,
  `per_km_rate` decimal(10,2) NOT NULL DEFAULT 15.00,
  `per_kg_rate` decimal(10,2) NOT NULL DEFAULT 5.00,
  `fuel_surcharge_percent` decimal(5,2) NOT NULL DEFAULT 10.00,
  `insurance_percent` decimal(5,2) NOT NULL DEFAULT 2.00,
  `minimum_charge` decimal(10,2) NOT NULL DEFAULT 200.00,
  `priority_multiplier` decimal(5,2) NOT NULL DEFAULT 1.50,
  `express_multiplier` decimal(5,2) NOT NULL DEFAULT 2.00,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default pricing configuration
INSERT INTO `pricing_config` (`base_rate`, `per_km_rate`, `per_kg_rate`, `fuel_surcharge_percent`, `insurance_percent`, `minimum_charge`, `priority_multiplier`, `express_multiplier`) VALUES
(100.00, 15.00, 5.00, 10.00, 2.00, 200.00, 1.00, 1.50);

-- ==========================================
-- SEED DATA FOR SUBSCRIPTIONS
-- ==========================================
INSERT INTO `subscriptions` (`slug`, `plan_name`, `description`, `price`, `term_months`, `active`) VALUES
('free', 'Free', 'Basic features for small businesses', 0, 1, 1),
('pro', 'Pro', 'Advanced features for growing companies', 49900, 1, 1),
('enterprise', 'Enterprise', 'Full access with premium support', 99900, 1, 1);

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. All amounts (charges, estimated_cost, amount, price, total_budget) are stored in centavos
--    Example: ₱336.00 is stored as 33600
-- 2. Organization-based multi-tenancy is implemented
-- 3. Email tracking feature included in shipments table
-- 4. Formatted numbers (quote_number, order_number, invoice_number) are auto-generated
-- 5. Run: php artisan migrate:fresh --seed to set up database with seed data
