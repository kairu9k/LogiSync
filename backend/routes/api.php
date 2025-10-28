<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\TransportController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\WarehouseController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\PayMongoCheckoutController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\PricingController;
use App\Http\Controllers\Api\NotificationController;

// ===== PUBLIC ROUTES (No authentication required) =====
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/resend-verification', [AuthController::class, 'resendVerification']);
});

// Public tracking
Route::get('/track/{trackingNumber}', [ShipmentController::class, 'track']);

// Subscription plans (public - anyone can view)
Route::get('/subscriptions/plans', [SubscriptionController::class, 'index']);

// Driver login (public)
Route::post('/driver/login', [DriverController::class, 'login']);


// ===== ADMIN ONLY ROUTES =====
Route::middleware(['role:admin'])->group(function () {
    // User Management (Team Management) - Admin only
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::post('/users', [UserController::class, 'store']);
    Route::patch('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    // Analytics - Admin only
    Route::get('/analytics/overview', [AnalyticsController::class, 'getOverviewMetrics']);
    Route::get('/analytics/revenue', [AnalyticsController::class, 'getRevenueAnalytics']);
    Route::get('/analytics/operational', [AnalyticsController::class, 'getOperationalMetrics']);
    Route::get('/analytics/customers', [AnalyticsController::class, 'getCustomerAnalytics']);
    Route::get('/analytics/inventory', [AnalyticsController::class, 'getInventoryAnalytics']);
    Route::get('/analytics/reports', [AnalyticsController::class, 'generateReport']);
});


// ===== BOOKING MANAGER & ADMIN ROUTES (Write Access) =====
Route::middleware(['role:admin,booking_manager'])->group(function () {
    // Quotes - Write Operations
    Route::post('/quotes', [QuoteController::class, 'store']);
    Route::post('/quotes/calculate', [QuoteController::class, 'calculate']);
    Route::patch('/quotes/{id}/status', [QuoteController::class, 'updateStatus']);
    Route::post('/quotes/{id}/convert-to-order', [QuoteController::class, 'convertToOrder']);

    // Orders - Write Operations
    Route::post('/orders', [OrderController::class, 'store']);
    Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);
    Route::patch('/orders/{id}', [OrderController::class, 'update']);
    Route::post('/orders/{id}/items', [OrderController::class, 'addItems']);
    Route::patch('/orders/{id}/items/{itemId}', [OrderController::class, 'updateItem']);
    Route::delete('/orders/{id}/items/{itemId}', [OrderController::class, 'deleteItem']);

    // Invoices - Write Operations
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::patch('/invoices/{id}/status', [InvoiceController::class, 'updateStatus']);
    Route::patch('/invoices/{id}/mark-paid', [InvoiceController::class, 'markAsPaid']);
    Route::post('/shipments/{shipmentId}/invoice', [InvoiceController::class, 'createFromShipment']);
    Route::patch('/invoices/update-overdue', [InvoiceController::class, 'updateOverdueStatuses']);
});


// ===== WAREHOUSE MANAGER & ADMIN ROUTES =====
Route::middleware(['role:admin,warehouse_manager'])->group(function () {
    // Warehouse Management (creation/modification restricted to warehouse_manager & admin)
    Route::post('/warehouses', [WarehouseController::class, 'store']);
    Route::patch('/warehouses/{id}', [WarehouseController::class, 'update']);
    Route::delete('/warehouses/{id}', [WarehouseController::class, 'destroy']);
    Route::post('/inventory/assign', [WarehouseController::class, 'assignItem']);
    Route::patch('/inventory/{id}', [WarehouseController::class, 'updateItemLocation']);

    // Budget Management - creation/modification (Admin & Warehouse Manager)
    Route::post('/budgets', [BudgetController::class, 'store']);
    Route::patch('/budgets/{id}', [BudgetController::class, 'update']);
    Route::delete('/budgets/{id}', [BudgetController::class, 'destroy']);
});


// ===== WAREHOUSE & ADMIN ROUTES (Warehouse Manager viewing only) =====
Route::middleware(['role:admin,warehouse_manager'])->group(function () {
    // Warehouse Management - viewing (warehouse manager & admin only)
    Route::get('/warehouses', [WarehouseController::class, 'index']);
    Route::get('/warehouses/{id}', [WarehouseController::class, 'show']);
    Route::get('/inventory', [WarehouseController::class, 'getInventory']);
    Route::get('/inventory/unassigned', [WarehouseController::class, 'getUnassignedItems']);
});

// ===== ALL STAFF ROUTES (Admin, Booking Manager, Warehouse Manager) =====
Route::middleware(['role:admin,booking_manager,warehouse_manager'])->group(function () {
    // Quotes - Read Access (all staff can view)
    Route::get('/quotes', [QuoteController::class, 'index']);

    // Orders - Read Access (all staff can view)
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);

    // Invoices - Read Access (all staff can view)
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::get('/dashboard/invoice-metrics', [InvoiceController::class, 'getDashboardMetrics']);

    // Budget Management - viewing (all staff can view for transport management)
    Route::get('/budgets', [BudgetController::class, 'index']);
    Route::get('/budgets/{id}', [BudgetController::class, 'show']);

    // Shipments - All staff can view/manage
    Route::get('/shipments', [ShipmentController::class, 'index']);
    Route::get('/shipments/{id}', [ShipmentController::class, 'show']);
    Route::post('/orders/{orderId}/shipments', [ShipmentController::class, 'createFromOrder']);
    Route::patch('/shipments/{id}/status', [ShipmentController::class, 'updateStatus']);

    // GPS Tracking
    Route::get('/shipments/{id}/location', [ShipmentController::class, 'getLocation']);
    Route::get('/shipments/{id}/location/history', [ShipmentController::class, 'getLocationHistory']);
    Route::post('/shipments/{id}/location', [ShipmentController::class, 'updateLocation']);

    // Transport Management
    Route::get('/transport', [TransportController::class, 'index']);
    Route::get('/transport/{id}', [TransportController::class, 'show']);
    Route::post('/transport', [TransportController::class, 'store']);
    Route::patch('/transport/{id}', [TransportController::class, 'update']);
    Route::delete('/transport/{id}', [TransportController::class, 'destroy']);

    // Helper endpoints for transport dropdowns
    Route::get('/transport/helpers/drivers', [TransportController::class, 'getDrivers']);
    Route::get('/transport/helpers/budgets', [TransportController::class, 'getBudgets']);
    Route::get('/transport/helpers/schedules', [TransportController::class, 'getSchedules']);

    // Schedule Management (All staff can view/manage)
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::get('/schedules/{id}', [ScheduleController::class, 'show']);
    Route::post('/schedules', [ScheduleController::class, 'store']);
    Route::patch('/schedules/{id}', [ScheduleController::class, 'update']);
    Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy']);

    // Dashboard
    Route::get('/dashboard/metrics', [DashboardController::class, 'getMetrics']);
    Route::get('/dashboard/warehouse-metrics', [WarehouseController::class, 'getDashboardMetrics']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread', [NotificationController::class, 'getUnread']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::delete('/notifications/clear-read', [NotificationController::class, 'clearRead']);

    // Subscriptions (all authenticated users)
    Route::get('/subscriptions/current', [SubscriptionController::class, 'getCurrentSubscription']);
    Route::post('/subscriptions/subscribe', [SubscriptionController::class, 'createPaymentIntent']);
    Route::post('/subscriptions/{id}/confirm', [SubscriptionController::class, 'confirmPayment']);
    Route::post('/subscriptions/{id}/cancel', [SubscriptionController::class, 'cancel']);
    Route::post('/subscriptions/checkout', [PayMongoCheckoutController::class, 'createCheckout']);
    Route::post('/subscriptions/payment-success', [PayMongoCheckoutController::class, 'handleSuccess']);

    // Pricing Configuration (all staff can view, only admin can update will be handled in controller)
    Route::get('/pricing/config', [PricingController::class, 'getConfig']);
    Route::post('/pricing/config', [PricingController::class, 'updateConfig']);
    Route::post('/pricing/preview', [PricingController::class, 'previewCalculation']);
});


// ===== DRIVER ROUTES =====
Route::middleware(['role:driver'])->group(function () {
    Route::get('/driver/shipments', [DriverController::class, 'getMyShipments']);
    Route::get('/driver/shipments/{id}', [DriverController::class, 'getShipmentDetail']);
    Route::patch('/driver/shipments/{id}/status', [DriverController::class, 'updateShipmentStatus']);
});

// ===== TEST ROUTES (Development only) =====
Route::get('/test-ably', function () {
    try {
        \Log::info('Test endpoint called');
        \Log::info('Broadcast driver: ' . config('broadcasting.default'));

        $event = new \App\Events\TestAblyConnection('Hello from LogiSync!');
        \Log::info('Event created', [
            'message' => $event->message,
            'timestamp' => $event->timestamp
        ]);

        event($event);
        \Log::info('Event fired successfully');

        return response()->json([
            'success' => true,
            'message' => 'Test event broadcasted via Ably',
            'timestamp' => now()->toDateTimeString(),
            'broadcast_driver' => config('broadcasting.default')
        ]);
    } catch (\Exception $e) {
        \Log::error('Test Ably error: ' . $e->getMessage(), [
            'trace' => $e->getTraceAsString()
        ]);
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});
