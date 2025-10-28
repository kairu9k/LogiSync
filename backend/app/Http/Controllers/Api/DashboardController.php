<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function getMetrics()
    {
        // Get authenticated user ID
        $userId = request()->header('X-User-Id');

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        // Get orders metrics - filter by user_id
        $ordersTotal = DB::table('orders')->where('organization_id', $userId)->count();
        $ordersPending = DB::table('orders')->where('organization_id', $userId)->where('order_status', 'pending')->count();
        $ordersProcessing = DB::table('orders')->where('organization_id', $userId)->where('order_status', 'processing')->count();
        $ordersFulfilled = DB::table('orders')->where('organization_id', $userId)->where('order_status', 'fulfilled')->count();

        // Get shipments metrics - filter by user_id through orders join
        $shipmentsTotal = DB::table('shipments as s')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('o.organization_id', $userId)
            ->count();
        $shipmentsPending = DB::table('shipments as s')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('o.organization_id', $userId)
            ->where('s.status', 'pending')
            ->count();
        $shipmentsInTransit = DB::table('shipments as s')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('o.organization_id', $userId)
            ->whereIn('s.status', ['picked_up', 'in_transit', 'out_for_delivery'])
            ->count();
        $shipmentsDelivered = DB::table('shipments as s')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('o.organization_id', $userId)
            ->where('s.status', 'delivered')
            ->count();

        // Get quotes metrics - filter by user_id
        $quotesTotal = DB::table('quotes')->where('organization_id', $userId)->count();
        $quotesPending = DB::table('quotes')->where('organization_id', $userId)->where('status', 'pending')->count();
        $quotesApproved = DB::table('quotes')->where('organization_id', $userId)->where('status', 'approved')->count();
        $quotesConverted = DB::table('quotes')->where('organization_id', $userId)->where('status', 'converted')->count();

        // Get invoices metrics - filter by user_id through shipments/orders join
        $invoicesTotal = DB::table('invoices as i')
            ->join('shipments as s', 'i.shipment_id', '=', 's.shipment_id')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('o.organization_id', $userId)
            ->count();
        $invoicesPending = DB::table('invoices as i')
            ->join('shipments as s', 'i.shipment_id', '=', 's.shipment_id')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('o.organization_id', $userId)
            ->where('i.status', 'pending')
            ->count();
        $invoicesPaid = DB::table('invoices as i')
            ->join('shipments as s', 'i.shipment_id', '=', 's.shipment_id')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('o.organization_id', $userId)
            ->where('i.status', 'paid')
            ->count();
        $invoicesOverdue = DB::table('invoices as i')
            ->join('shipments as s', 'i.shipment_id', '=', 's.shipment_id')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('o.organization_id', $userId)
            ->where('i.status', 'overdue')
            ->count();
        $totalUnpaid = DB::table('invoices as i')
            ->join('shipments as s', 'i.shipment_id', '=', 's.shipment_id')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('o.organization_id', $userId)
            ->whereIn('i.status', ['pending', 'overdue'])
            ->sum('i.amount');

        // Get recent orders - filter by user_id
        $recentOrders = DB::table('orders as o')
            ->select('o.order_id as id', 'o.order_status as status', 'o.order_date', 'o.customer_name')
            ->where('o.organization_id', $userId)
            ->orderByDesc('o.order_date')
            ->limit(5)
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'po' => 'PO-' . str_pad($order->id, 5, '0', STR_PAD_LEFT),
                    'customer' => $order->customer_name ?? 'Unknown',
                    'status' => $order->status,
                    'date' => $order->order_date,
                ];
            });

        // Get recent shipments with issues (pending or delayed) - filter by user_id
        $shipmentsWithIssues = DB::table('shipments as s')
            ->leftJoin('orders as o', 's.order_id', '=', 'o.order_id')
            ->select('s.tracking_number', 's.status', 's.creation_date', 'o.customer_name')
            ->where('o.organization_id', $userId)
            ->whereIn('s.status', ['pending'])
            ->where('s.creation_date', '<', Carbon::now()->subDays(2)) // Pending for more than 2 days
            ->orderByDesc('s.creation_date')
            ->limit(3)
            ->get();

        // Get recent quotes - filter by user_id
        $recentQuotes = DB::table('quotes as q')
            ->select('q.quote_id as id', 'q.status', 'q.creation_date', 'q.customer_name', 'q.estimated_cost')
            ->where('q.organization_id', $userId)
            ->orderByDesc('q.creation_date')
            ->limit(3)
            ->get()
            ->map(function ($quote) {
                return [
                    'id' => $quote->id,
                    'customer' => $quote->customer_name ?? 'Unknown',
                    'status' => $quote->status,
                    'amount' => '₱' . number_format($quote->estimated_cost / 100.0, 2),
                    'date' => $quote->creation_date,
                ];
            });

        return response()->json([
            'data' => [
                'orders' => [
                    'total' => $ordersTotal,
                    'pending' => $ordersPending,
                    'processing' => $ordersProcessing,
                    'fulfilled' => $ordersFulfilled,
                ],
                'shipments' => [
                    'total' => $shipmentsTotal,
                    'pending' => $shipmentsPending,
                    'active' => $shipmentsInTransit, // in_transit + out_for_delivery
                    'delivered' => $shipmentsDelivered,
                ],
                'quotes' => [
                    'total' => $quotesTotal,
                    'pending' => $quotesPending,
                    'approved' => $quotesApproved,
                    'converted' => $quotesConverted,
                ],
                'invoices' => [
                    'total' => $invoicesTotal,
                    'pending' => $invoicesPending,
                    'paid' => $invoicesPaid,
                    'overdue' => $invoicesOverdue,
                    'total_unpaid' => $totalUnpaid,
                    'formatted_total_unpaid' => '₱' . number_format($totalUnpaid / 100.0, 2),
                ],
                'recent_orders' => $recentOrders,
                'recent_quotes' => $recentQuotes,
                'issues' => [
                    'delayed_shipments' => $shipmentsWithIssues->count(),
                    'overdue_invoices' => $invoicesOverdue,
                    'pending_quotes' => $quotesPending,
                ],
                'notifications' => $this->generateNotifications($shipmentsWithIssues, $invoicesOverdue, $quotesPending)
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    private function generateNotifications($delayedShipments, $overdueInvoices, $pendingQuotes)
    {
        $notifications = [];

        if ($delayedShipments > 0) {
            $notifications[] = "{$delayedShipments} shipment" . ($delayedShipments > 1 ? 's' : '') . " pending for more than 2 days.";
        }

        if ($overdueInvoices > 0) {
            $notifications[] = "{$overdueInvoices} invoice" . ($overdueInvoices > 1 ? 's' : '') . " overdue - follow up required.";
        }

        if ($pendingQuotes > 0) {
            $notifications[] = "{$pendingQuotes} quote request" . ($pendingQuotes > 1 ? 's' : '') . " awaiting approval.";
        }

        // Add some default notifications if none exist
        if (empty($notifications)) {
            $notifications[] = "All systems running smoothly.";
            $notifications[] = "No urgent issues require attention.";
        }

        return $notifications;
    }
}