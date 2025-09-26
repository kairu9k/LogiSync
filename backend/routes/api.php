<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\TransportController;
use App\Http\Controllers\Api\DriverController;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// Orders
Route::get('/orders', [OrderController::class, 'index']);
Route::get('/orders/{id}', [OrderController::class, 'show']);
Route::post('/orders', [OrderController::class, 'store']);
Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);
Route::patch('/orders/{id}', [OrderController::class, 'update']);
Route::post('/orders/{id}/items', [OrderController::class, 'addItems']);
Route::patch('/orders/{id}/items/{itemId}', [OrderController::class, 'updateItem']);
Route::delete('/orders/{id}/items/{itemId}', [OrderController::class, 'deleteItem']);

// Quotes
Route::get('/quotes', [QuoteController::class, 'index']);
Route::post('/quotes', [QuoteController::class, 'store']);
Route::post('/quotes/calculate', [QuoteController::class, 'calculate']);
Route::patch('/quotes/{id}/status', [QuoteController::class, 'updateStatus']);
Route::post('/quotes/{id}/convert-to-order', [QuoteController::class, 'convertToOrder']);

// Shipments
Route::get('/shipments', [ShipmentController::class, 'index']);
Route::get('/shipments/{id}', [ShipmentController::class, 'show']);
Route::post('/orders/{orderId}/shipments', [ShipmentController::class, 'createFromOrder']);
Route::patch('/shipments/{id}/status', [ShipmentController::class, 'updateStatus']);
Route::get('/track/{trackingNumber}', [ShipmentController::class, 'track']);

// Transport
Route::get('/transport', [TransportController::class, 'index']);

// Driver Mobile Interface
Route::post('/driver/login', [DriverController::class, 'login']);
Route::get('/driver/shipments', [DriverController::class, 'getMyShipments']);
Route::get('/driver/shipments/{id}', [DriverController::class, 'getShipmentDetail']);
Route::patch('/driver/shipments/{id}/status', [DriverController::class, 'updateShipmentStatus']);

Route::post('/invoices', [InvoiceController::class, 'store']);

// CORS preflight for dev
Route::options('/{any}', function () {
    return response('')->header('Access-Control-Allow-Origin', '*')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
})->where('any', '.*');
