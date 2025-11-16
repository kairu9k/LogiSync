<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function getOverviewMetrics(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $dateFrom = $request->query('date_from', Carbon::now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->query('date_to', Carbon::now()->format('Y-m-d'));

        try {
            // Overall business metrics (filtered by organization)
            $totalRevenue = DB::table('invoices as i')
                ->join('orders as o', 'i.order_id', '=', 'o.order_id')
                ->where('i.status', 'paid')
                ->where('o.organization_id', $orgUserId)
                ->whereBetween('i.invoice_date', [$dateFrom, $dateTo])
                ->sum('i.amount');

            $totalOrders = DB::table('orders')
                ->where('organization_id', $orgUserId)
                ->whereBetween('order_date', [$dateFrom, $dateTo])
                ->count();

            $completedOrders = DB::table('orders')
                ->where('organization_id', $orgUserId)
                ->where('order_status', 'fulfilled')
                ->whereBetween('order_date', [$dateFrom, $dateTo])
                ->count();

            $totalShipments = DB::table('shipments as s')
                ->join('orders as o', 's.order_id', '=', 'o.order_id')
                ->where('o.organization_id', $orgUserId)
                ->whereBetween('s.creation_date', [$dateFrom, $dateTo])
                ->count();

            $deliveredShipments = DB::table('shipments as s')
                ->join('orders as o', 's.order_id', '=', 'o.order_id')
                ->where('o.organization_id', $orgUserId)
                ->where('s.status', 'delivered')
                ->whereBetween('s.creation_date', [$dateFrom, $dateTo])
                ->count();

            // Calculate fulfillment rate
            $fulfillmentRate = $totalOrders > 0 ? round(($completedOrders / $totalOrders) * 100, 1) : 0;
            $deliveryRate = $totalShipments > 0 ? round(($deliveredShipments / $totalShipments) * 100, 1) : 0;

            // Average delivery time
            $avgDeliveryTime = DB::table('shipments as s')
                ->join('orders as o', 's.order_id', '=', 'o.order_id')
                ->selectRaw('AVG(DATEDIFF(DATE(NOW()), s.creation_date)) as avg_days')
                ->where('o.organization_id', $orgUserId)
                ->where('s.status', 'delivered')
                ->whereBetween('s.creation_date', [$dateFrom, $dateTo])
                ->first();

            $data = [
                'total_revenue' => $totalRevenue,
                'formatted_revenue' => '₱' . number_format($totalRevenue / 100.0, 2),
                'total_orders' => $totalOrders,
                'completed_orders' => $completedOrders,
                'total_shipments' => $totalShipments,
                'delivered_shipments' => $deliveredShipments,
                'fulfillment_rate' => $fulfillmentRate,
                'delivery_rate' => $deliveryRate,
                'avg_delivery_days' => round($avgDeliveryTime->avg_days ?? 0, 1),
                'date_range' => [
                    'from' => $dateFrom,
                    'to' => $dateTo
                ]
            ];

            return response()->json(['data' => $data])
                ->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to load metrics'], 500)
                ->header('Access-Control-Allow-Origin', '*');
        }
    }

    public function getRevenueAnalytics(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $period = $request->query('period', 'month'); // day, week, month, year
        $dateFrom = $request->query('date_from', Carbon::now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->query('date_to', Carbon::now()->format('Y-m-d'));

        try {
            $groupBy = match($period) {
                'day' => "DATE(i.invoice_date)",
                'week' => "YEARWEEK(i.invoice_date, 1)",
                'month' => "DATE_FORMAT(i.invoice_date, '%Y-%m')",
                'year' => "YEAR(i.invoice_date)",
                default => "DATE_FORMAT(i.invoice_date, '%Y-%m')"
            };

            $revenueData = DB::table('invoices as i')
                ->join('orders as o', 'i.order_id', '=', 'o.order_id')
                ->selectRaw("$groupBy as period, SUM(i.amount) as revenue, COUNT(*) as invoice_count")
                ->where('i.status', 'paid')
                ->where('o.organization_id', $orgUserId)
                ->whereBetween('i.invoice_date', [$dateFrom, $dateTo])
                ->groupBy(DB::raw($groupBy))
                ->orderBy(DB::raw($groupBy))
                ->get();

            $chartData = $revenueData->map(function ($item) use ($period) {
                return [
                    'period' => $item->period,
                    'revenue' => (int) $item->revenue,
                    'formatted_revenue' => '₱' . number_format($item->revenue / 100.0, 2),
                    'invoice_count' => (int) $item->invoice_count,
                ];
            });

            return response()->json(['data' => $chartData])
                ->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to load revenue analytics'], 500)
                ->header('Access-Control-Allow-Origin', '*');
        }
    }

    public function getOperationalMetrics(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $dateFrom = $request->query('date_from', Carbon::now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->query('date_to', Carbon::now()->format('Y-m-d'));

        try {
            // Delivery performance by status
            $deliveryMetrics = DB::table('shipments as s')
                ->join('orders as o', 's.order_id', '=', 'o.order_id')
                ->selectRaw('s.status, COUNT(*) as count')
                ->where('o.organization_id', $orgUserId)
                ->whereBetween('s.creation_date', [$dateFrom, $dateTo])
                ->groupBy('s.status')
                ->get();

            // Top performing routes (origin to destination)
            $topRoutes = DB::table('shipments as s')
                ->join('orders as o', 's.order_id', '=', 'o.order_id')
                ->selectRaw('s.origin_name, s.destination_name, COUNT(*) as shipment_count, AVG(s.charges) as avg_cost')
                ->where('o.organization_id', $orgUserId)
                ->whereBetween('s.creation_date', [$dateFrom, $dateTo])
                ->groupBy('s.origin_name', 's.destination_name')
                ->orderByDesc('shipment_count')
                ->limit(10)
                ->get()
                ->map(function ($route) {
                    return [
                        'route' => $route->origin_name . ' → ' . $route->destination_name,
                        'shipment_count' => (int) $route->shipment_count,
                        'avg_cost' => '₱' . number_format($route->avg_cost / 100.0, 2),
                    ];
                });

            // Driver performance (if drivers are assigned)
            $driverPerformance = DB::table('shipments as s')
                ->join('orders as o', 's.order_id', '=', 'o.order_id')
                ->leftJoin('transport as t', 's.transport_id', '=', 't.transport_id')
                ->leftJoin('users as u', 't.driver_id', '=', 'u.user_id')
                ->selectRaw('u.username as driver_name, COUNT(*) as total_deliveries,
                           SUM(CASE WHEN s.status = "delivered" THEN 1 ELSE 0 END) as completed_deliveries')
                ->where('o.organization_id', $orgUserId)
                ->whereBetween('s.creation_date', [$dateFrom, $dateTo])
                ->whereNotNull('u.username')
                ->groupBy('u.user_id', 'u.username')
                ->orderByDesc('completed_deliveries')
                ->limit(10)
                ->get()
                ->map(function ($driver) {
                    $completionRate = $driver->total_deliveries > 0
                        ? round(($driver->completed_deliveries / $driver->total_deliveries) * 100, 1)
                        : 0;
                    return [
                        'driver_name' => $driver->driver_name,
                        'total_deliveries' => (int) $driver->total_deliveries,
                        'completed_deliveries' => (int) $driver->completed_deliveries,
                        'completion_rate' => $completionRate,
                    ];
                });

            $data = [
                'delivery_status_breakdown' => $deliveryMetrics->map(function ($item) {
                    return [
                        'status' => $item->status,
                        'count' => (int) $item->count,
                    ];
                }),
                'top_routes' => $topRoutes,
                'driver_performance' => $driverPerformance,
            ];

            return response()->json(['data' => $data])
                ->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to load operational metrics'], 500)
                ->header('Access-Control-Allow-Origin', '*');
        }
    }

    public function getCustomerAnalytics(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $dateFrom = $request->query('date_from', Carbon::now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->query('date_to', Carbon::now()->format('Y-m-d'));

        try {
            // Top customers by revenue
            $topCustomers = DB::table('invoices as i')
                ->leftJoin('orders as o', 'i.order_id', '=', 'o.order_id')
                ->leftJoin('users as u', 'o.organization_id', '=', 'u.user_id')
                ->selectRaw('u.username as customer_name, COUNT(i.invoice_id) as total_invoices,
                           SUM(i.amount) as total_revenue, AVG(i.amount) as avg_order_value')
                ->where('i.status', 'paid')
                ->where('o.organization_id', $orgUserId)
                ->whereBetween('i.invoice_date', [$dateFrom, $dateTo])
                ->whereNotNull('u.username')
                ->groupBy('u.user_id', 'u.username')
                ->orderByDesc('total_revenue')
                ->limit(10)
                ->get()
                ->map(function ($customer) {
                    return [
                        'customer_name' => $customer->customer_name,
                        'total_invoices' => (int) $customer->total_invoices,
                        'total_revenue' => (int) $customer->total_revenue,
                        'formatted_revenue' => '₱' . number_format($customer->total_revenue / 100.0, 2),
                        'avg_order_value' => '₱' . number_format($customer->avg_order_value / 100.0, 2),
                    ];
                });

            // Customer activity trends
            $customerTrends = DB::table('orders as o')
                ->leftJoin('users as u', 'o.organization_id', '=', 'u.user_id')
                ->selectRaw("DATE_FORMAT(o.order_date, '%Y-%m') as month, COUNT(DISTINCT u.user_id) as unique_customers")
                ->where('o.organization_id', $orgUserId)
                ->whereBetween('o.order_date', [$dateFrom, $dateTo])
                ->groupBy(DB::raw("DATE_FORMAT(o.order_date, '%Y-%m')"))
                ->orderBy(DB::raw("DATE_FORMAT(o.order_date, '%Y-%m')"))
                ->get();

            $data = [
                'top_customers' => $topCustomers,
                'customer_trends' => $customerTrends->map(function ($trend) {
                    return [
                        'month' => $trend->month,
                        'unique_customers' => (int) $trend->unique_customers,
                    ];
                }),
            ];

            return response()->json(['data' => $data])
                ->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to load customer analytics'], 500)
                ->header('Access-Control-Allow-Origin', '*');
        }
    }

    public function getInventoryAnalytics(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);

        try {
            // Warehouse utilization
            $warehouseUtilization = DB::table('warehouse as w')
                ->leftJoin('inventory as i', 'w.warehouse_id', '=', 'i.warehouse_id')
                ->selectRaw('w.warehouse_name, w.location, COUNT(i.inventory_id) as item_count')
                ->where('w.organization_id', $orgUserId)
                ->groupBy('w.warehouse_id', 'w.warehouse_name', 'w.location')
                ->orderByDesc('item_count')
                ->get()
                ->map(function ($warehouse) {
                    $capacity = 1000; // Default capacity
                    $utilization = $warehouse->item_count > 0 ? round(($warehouse->item_count / $capacity) * 100, 1) : 0;
                    return [
                        'warehouse_name' => $warehouse->warehouse_name,
                        'location' => $warehouse->location,
                        'item_count' => (int) $warehouse->item_count,
                        'utilization_percentage' => $utilization,
                        'status' => $utilization >= 90 ? 'critical' : ($utilization >= 70 ? 'warning' : 'good'),
                    ];
                });

            // Product movement analysis
            $productMovement = DB::table('inventory as i')
                ->leftJoin('order_details as od', 'i.order_details_id', '=', 'od.order_details_id')
                ->leftJoin('orders as o', 'od.order_id', '=', 'o.order_id')
                ->selectRaw('od.product_id, COUNT(*) as movement_count, SUM(od.quantity) as total_quantity, o.order_status')
                ->groupBy('od.product_id', 'o.order_status')
                ->orderByDesc('movement_count')
                ->limit(20)
                ->get()
                ->map(function ($movement) {
                    return [
                        'product_id' => 'PROD-' . str_pad((string) $movement->product_id, 4, '0', STR_PAD_LEFT),
                        'movement_count' => (int) $movement->movement_count,
                        'total_quantity' => (int) $movement->total_quantity,
                        'status' => $movement->order_status,
                    ];
                });

            // Storage efficiency metrics
            $storageMetrics = [
                'total_warehouses' => DB::table('warehouse')->where('organization_id', $orgUserId)->count(),
                'total_inventory_items' => DB::table('inventory as i')
                    ->join('warehouse as w', 'i.warehouse_id', '=', 'w.warehouse_id')
                    ->where('w.organization_id', $orgUserId)
                    ->count(),
                'unassigned_items' => 0, // Removed - no longer tracking order details
                'avg_items_per_warehouse' => round(
                    DB::table('inventory as i')
                        ->join('warehouse as w', 'i.warehouse_id', '=', 'w.warehouse_id')
                        ->where('w.organization_id', $orgUserId)
                        ->count() / max(1, DB::table('warehouse')->where('organization_id', $orgUserId)->count()),
                    1
                ),
            ];

            $data = [
                'warehouse_utilization' => $warehouseUtilization,
                'product_movement' => $productMovement,
                'storage_metrics' => $storageMetrics,
            ];

            return response()->json(['data' => $data])
                ->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to load inventory analytics'], 500)
                ->header('Access-Control-Allow-Origin', '*');
        }
    }

    public function generateReport(Request $request)
    {
        $reportType = $request->query('type', 'overview');
        $dateFrom = $request->query('date_from', Carbon::now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->query('date_to', Carbon::now()->format('Y-m-d'));

        try {
            $reportData = [
                'report_type' => $reportType,
                'generated_at' => Carbon::now()->toISOString(),
                'date_range' => ['from' => $dateFrom, 'to' => $dateTo],
            ];

            switch ($reportType) {
                case 'revenue':
                    $reportData['data'] = $this->getRevenueReportData($dateFrom, $dateTo);
                    break;
                case 'operational':
                    $reportData['data'] = $this->getOperationalReportData($dateFrom, $dateTo);
                    break;
                case 'customer':
                    $reportData['data'] = $this->getCustomerReportData($dateFrom, $dateTo);
                    break;
                case 'inventory':
                    $reportData['data'] = $this->getInventoryReportData();
                    break;
                default:
                    $reportData['data'] = $this->getOverviewReportData($dateFrom, $dateTo);
            }

            return response()->json(['data' => $reportData])
                ->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to generate report'], 500)
                ->header('Access-Control-Allow-Origin', '*');
        }
    }

    private function getOverviewReportData($dateFrom, $dateTo)
    {
        return [
            'summary' => [
                'total_orders' => DB::table('orders')->whereBetween('order_date', [$dateFrom, $dateTo])->count(),
                'total_shipments' => DB::table('shipments')->whereBetween('creation_date', [$dateFrom, $dateTo])->count(),
                'total_revenue' => DB::table('invoices')->where('status', 'paid')->whereBetween('invoice_date', [$dateFrom, $dateTo])->sum('amount'),
                'active_customers' => DB::table('orders')->leftJoin('users', 'orders.user_id', '=', 'users.user_id')->whereBetween('order_date', [$dateFrom, $dateTo])->distinct('users.user_id')->count(),
            ],
            'trends' => [
                'orders_by_day' => DB::table('orders')
                    ->selectRaw('DATE(order_date) as date, COUNT(*) as count')
                    ->whereBetween('order_date', [$dateFrom, $dateTo])
                    ->groupBy(DB::raw('DATE(order_date)'))
                    ->orderBy('date')
                    ->get(),
            ]
        ];
    }

    private function getRevenueReportData($dateFrom, $dateTo)
    {
        return [
            'total_revenue' => DB::table('invoices')->where('status', 'paid')->whereBetween('invoice_date', [$dateFrom, $dateTo])->sum('amount'),
            'revenue_by_month' => DB::table('invoices')
                ->selectRaw("DATE_FORMAT(invoice_date, '%Y-%m') as month, SUM(amount) as revenue")
                ->where('status', 'paid')
                ->whereBetween('invoice_date', [$dateFrom, $dateTo])
                ->groupBy(DB::raw("DATE_FORMAT(invoice_date, '%Y-%m')"))
                ->get(),
        ];
    }

    private function getOperationalReportData($dateFrom, $dateTo)
    {
        return [
            'delivery_metrics' => DB::table('shipments')
                ->selectRaw('status, COUNT(*) as count')
                ->whereBetween('creation_date', [$dateFrom, $dateTo])
                ->groupBy('status')
                ->get(),
            'performance_summary' => [
                'on_time_deliveries' => DB::table('shipments')->where('status', 'delivered')->whereBetween('creation_date', [$dateFrom, $dateTo])->count(),
                'total_shipments' => DB::table('shipments')->whereBetween('creation_date', [$dateFrom, $dateTo])->count(),
            ]
        ];
    }

    private function getCustomerReportData($dateFrom, $dateTo)
    {
        return [
            'top_customers' => DB::table('invoices as i')
                ->leftJoin('orders as o', 'i.order_id', '=', 'o.order_id')
                ->leftJoin('users as u', 'o.organization_id', '=', 'u.user_id')
                ->selectRaw('u.username, SUM(i.amount) as total_spent, COUNT(*) as order_count')
                ->where('i.status', 'paid')
                ->whereBetween('i.invoice_date', [$dateFrom, $dateTo])
                ->groupBy('u.user_id', 'u.username')
                ->orderByDesc('total_spent')
                ->limit(10)
                ->get(),
        ];
    }

    private function getInventoryReportData()
    {
        return [
            'warehouse_summary' => DB::table('warehouse as w')
                ->leftJoin('inventory as i', 'w.warehouse_id', '=', 'i.warehouse_id')
                ->selectRaw('w.warehouse_name, COUNT(i.inventory_id) as item_count')
                ->groupBy('w.warehouse_id', 'w.warehouse_name')
                ->get(),
        ];
    }
}