-- Create Users table
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL UNIQUE,
  PRIMARY KEY (`user_id`),
  KEY `role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Warehouse table
CREATE TABLE `warehouse` (
  `warehouse_id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_name` varchar(255) NOT NULL,
  `location` text NOT NULL,
  PRIMARY KEY (`warehouse_id`),
  KEY `warehouse_name` (`warehouse_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Subscriptions table
CREATE TABLE `subscriptions` (
  `subscription_id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_name` varchar(255) NOT NULL,
  `description` text,
  `price` int(11) NOT NULL,
  `term_months` int(11) NOT NULL,
  PRIMARY KEY (`subscription_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create User_Subscriptions table
CREATE TABLE `user_subscriptions` (
  `user_subscription_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subscription_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`user_subscription_id`),
  KEY `user_id` (`user_id`),
  KEY `subscription_id` (`subscription_id`),
  KEY `status` (`status`),
  CONSTRAINT `fk_user_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_subscriptions_plan` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`subscription_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Budgets table
CREATE TABLE `budgets` (
  `budget_id` int(11) NOT NULL AUTO_INCREMENT,
  `budget_name` varchar(255) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_budget` int(11) NOT NULL,
  PRIMARY KEY (`budget_id`),
  KEY `budget_name` (`budget_name`),
  KEY `start_date` (`start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Schedules table
CREATE TABLE `schedules` (
  `schedule_id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_name` varchar(255) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `route_details` text,
  PRIMARY KEY (`schedule_id`),
  KEY `schedule_name` (`schedule_name`),
  KEY `start_time` (`start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Transport table
CREATE TABLE `transport` (
  `transport_id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` varchar(255) NOT NULL,
  `vehicle_type` varchar(255) NOT NULL,
  `registration_number` varchar(255) NOT NULL UNIQUE,
  `capacity` varchar(255) NOT NULL,
  `safety_compliance_details` text,
  `budget_id` int(11) NOT NULL,
  `schedule_id` int(11) NOT NULL,
  `driver_id` int(11) NOT NULL,
  PRIMARY KEY (`transport_id`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `driver_id` (`driver_id`),
  KEY `budget_id` (`budget_id`),
  KEY `schedule_id` (`schedule_id`),
  CONSTRAINT `fk_transport_driver` FOREIGN KEY (`driver_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transport_budget` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`budget_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transport_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`schedule_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Quotes table
CREATE TABLE `quotes` (
  `quote_id` int(11) NOT NULL AUTO_INCREMENT,
  `creation_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` int(11) NOT NULL,
  `weight` int(11) NOT NULL,
  `dimensions` varchar(255) NOT NULL,
  `estimated_cost` int(11) NOT NULL,
  `expiry_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `distance` int(11) NOT NULL,
  PRIMARY KEY (`quote_id`),
  KEY `user_id` (`user_id`),
  KEY `status` (`status`),
  KEY `creation_date` (`creation_date`),
  CONSTRAINT `fk_quotes_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Orders table
CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` int(11) NOT NULL,
  `order_status` varchar(50) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`order_id`),
  KEY `user_id` (`user_id`),
  KEY `order_status` (`order_status`),
  KEY `order_date` (`order_date`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Order_Details table
CREATE TABLE `order_details` (
  `order_details_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  PRIMARY KEY (`order_details_id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `fk_order_details_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Inventory table
CREATE TABLE `inventory` (
  `inventory_id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(11) NOT NULL,
  `location_in_warehouse` varchar(255) NOT NULL,
  `order_details_id` int(11) NOT NULL,
  PRIMARY KEY (`inventory_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `order_details_id` (`order_details_id`),
  CONSTRAINT `fk_inventory_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`warehouse_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_order_details` FOREIGN KEY (`order_details_id`) REFERENCES `order_details`(`order_details_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Invoices table
CREATE TABLE `invoices` (
  `invoice_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `invoice_type` varchar(255) NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `amount` int(11) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`invoice_id`),
  KEY `order_id` (`order_id`),
  KEY `status` (`status`),
  KEY `invoice_date` (`invoice_date`),
  CONSTRAINT `fk_invoices_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Shipments table
CREATE TABLE `shipments` (
  `shipment_id` int(11) NOT NULL AUTO_INCREMENT,
  `tracking_number` varchar(255) NOT NULL UNIQUE,
  `receiver_name` varchar(255) NOT NULL,
  `receiver_address` text NOT NULL,
  `origin_name` varchar(255) NOT NULL,
  `origin_address` text NOT NULL,
  `destination_name` varchar(255) NOT NULL,
  `destination_address` text NOT NULL,
  `creation_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `charges` int(11) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `departure_date` date,
  `order_id` int(11) NOT NULL,
  `transport_id` int(11) NOT NULL,
  PRIMARY KEY (`shipment_id`),
  KEY `order_id` (`order_id`),
  KEY `transport_id` (`transport_id`),
  KEY `status` (`status`),
  KEY `creation_date` (`creation_date`),
  CONSTRAINT `fk_shipments_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_shipments_transport` FOREIGN KEY (`transport_id`) REFERENCES `transport`(`transport_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Tracking_History table
CREATE TABLE `tracking_history` (
  `tracking_history_id` int(11) NOT NULL AUTO_INCREMENT,
  `shipment_id` int(11) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `location` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL,
  `details` text,
  PRIMARY KEY (`tracking_history_id`),
  KEY `shipment_id` (`shipment_id`),
  KEY `timestamp` (`timestamp`),
  KEY `status` (`status`),
  CONSTRAINT `fk_tracking_history_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`shipment_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data
INSERT INTO `users` (`username`, `password`, `role`, `email`) VALUES
('admin01', '$2y$10$example_hashed_password1', 'admin', 'admin@logisync.com'),
('warehouse_mgr', '$2y$10$example_hashed_password2', 'warehouse_manager', 'warehouse@logisync.com'),
('driver01', '$2y$10$example_hashed_password3', 'driver', 'driver01@logisync.com'),
('booking_mgr', '$2y$10$example_hashed_password4', 'booking_manager', 'booking@logisync.com');

INSERT INTO `schedules` (`schedule_name`, `start_time`, `end_time`, `route_details`) VALUES
('Morning Delivery Route', '2024-01-16 08:00:00', '2024-01-16 12:00:00', 'Davao to Manila via SLEX'),
('Afternoon Pickup Route', '2024-01-16 13:00:00', '2024-01-16 17:00:00', 'Manila to Cebu via ferry'),
('Express Overnight', '2024-01-16 20:00:00', '2024-01-17 06:00:00', 'Direct route Manila to Davao');

INSERT INTO `budgets` (`budget_name`, `start_date`, `end_date`, `total_budget`) VALUES
('Q1 2024 Transport Budget', '2024-01-01', '2024-03-31', 50000),
('Annual Fleet Budget', '2024-01-01', '2024-12-31', 200000),
('Emergency Transport Fund', '2024-01-01', '2024-12-31', 25000);

INSERT INTO `transport` (`vehicle_id`, `vehicle_type`, `registration_number`, `capacity`, `safety_compliance_details`, `budget_id`, `schedule_id`, `driver_id`) VALUES
('V001', 'Truck', 'ABC-1234', '5000kg', 'All safety inspections current', 1, 1, 3),
('V002', 'Van', 'XYZ-5678', '2000kg', 'DOT certified, insurance valid', 2, 2, 3);

INSERT INTO `orders` (`user_id`, `order_status`) VALUES
(1, 'processing'),
(2, 'shipped'),
(3, 'delivered');

INSERT INTO `shipments` (`tracking_number`, `receiver_name`, `receiver_address`, `origin_name`, `origin_address`, `destination_name`, `destination_address`, `charges`, `status`, `departure_date`, `order_id`, `transport_id`) VALUES
('LS2024001', 'Juan Dela Cruz', 'Quezon City, Metro Manila', 'Davao Warehouse', 'Davao City, Philippines', 'Manila Hub', 'Manila, Philippines', 1500, 'in_transit', '2024-01-16', 1, 1),
('LS2024002', 'Maria Santos', 'Cebu City, Philippines', 'Manila Hub', 'Manila, Philippines', 'Cebu Distribution', 'Cebu City, Philippines', 2800, 'delivered', '2024-01-21', 2, 2);

INSERT INTO `tracking_history` (`shipment_id`, `location`, `status`, `details`) VALUES
(1, 'Davao Warehouse', 'picked_up', 'Package picked up by driver'),
(1, 'Davao Port', 'in_transit', 'Loaded onto ferry to Manila'),
(1, 'Manila Port', 'in_transit', 'Arrived at Manila port, transferred to truck'),
(1, 'Manila Hub', 'in_transit', 'Package sorted at distribution center'),
(2, 'Manila Hub', 'picked_up', 'Package collected for delivery'),
(2, 'Cebu Distribution', 'delivered', 'Successfully delivered to recipient');
