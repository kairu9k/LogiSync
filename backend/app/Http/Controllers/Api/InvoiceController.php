<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use App\Models\Invoice;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $status = $request->query('status');
        $search = $request->query('q');
        $limit = (int) ($request->query('limit', 20));
        $limit = max(1, min($limit, 100));

        $query = DB::table('invoices as i')
            ->leftJoin('orders as o', 'i.order_id', '=', 'o.order_id')
            ->leftJoin('shipments as s', 'i.shipment_id', '=', 's.shipment_id')
            ->where('o.organization_id', $orgUserId)
            ->select(
                'i.invoice_id',
                'i.invoice_number',
                'i.invoice_type',
                'i.invoice_date',
                'i.due_date',
                'i.amount',
                'i.status',
                'i.payment_date',
                'i.payment_method',
                'o.customer_name',
                's.tracking_number'
            )
            ->orderByDesc('i.invoice_date');

        if ($status && $status !== 'any') {
            $query->where('i.status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $numeric = (int) preg_replace('/[^0-9]/', '', $search);
                $q->where('o.customer_name', 'like', "%$search%")
                  ->orWhere('i.invoice_id', $numeric)
                  ->orWhere('s.tracking_number', 'like', "%$search%");
            });
        }

        $rows = $query->limit($limit)->get();

        $data = $rows->map(function ($row) {
            return [
                'id' => (int) $row->invoice_id,
                'invoice_number' => $row->invoice_number ?? ('INV-' . str_pad((string) $row->invoice_id, 6, '0', STR_PAD_LEFT)),
                'customer' => $row->customer_name ?? 'N/A',
                'amount' => (int) $row->amount,
                'formatted_amount' => '₱' . number_format($row->amount / 100.0, 2),
                'status' => $row->status,
                'invoice_type' => $row->invoice_type,
                'invoice_date' => $row->invoice_date,
                'due_date' => $row->due_date,
                'payment_date' => $row->payment_date,
                'payment_method' => $row->payment_method,
                'tracking_number' => $row->tracking_number,
                'days_overdue' => $row->status === 'pending' && Carbon::parse($row->due_date)->lt(Carbon::now())
                    ? Carbon::now()->diffInDays(Carbon::parse($row->due_date)) : 0,
                'is_overdue' => $row->status === 'pending' && Carbon::parse($row->due_date)->lt(Carbon::now()),
            ];
        });

        return response()->json([
            'data' => $data,
            'summary' => [
                'total' => $data->count(),
                'pending' => $data->where('status', 'pending')->count(),
                'paid' => $data->where('status', 'paid')->count(),
                'overdue' => $data->where('is_overdue', true)->count(),
                'total_unpaid' => $data->whereIn('status', ['pending', 'overdue'])->sum('amount'),
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function show(int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $invoice = DB::table('invoices as i')
            ->leftJoin('orders as o', 'i.order_id', '=', 'o.order_id')
            ->leftJoin('shipments as s', 'i.shipment_id', '=', 's.shipment_id')
            ->leftJoin('quotes as q', 'i.quote_id', '=', 'q.quote_id')
            ->where('i.invoice_id', $id)
            ->where('o.organization_id', $orgUserId)
            ->select(
                'i.*',
                'o.customer_name',
                's.tracking_number',
                's.receiver_name',
                's.receiver_address',
                'q.total_amount as quote_amount'
            )
            ->first();

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get order details for itemization
        $orderDetails = [];
        if ($invoice->order_id) {
            $orderDetails = DB::table('order_details')->where('order_id', $invoice->order_id)
                ->select('product_id', 'quantity')
                ->get()->toArray();
        }

        $data = [
            'id' => (int) $invoice->invoice_id,
            'invoice_number' => $invoice->invoice_number ?? ('INV-' . str_pad((string) $invoice->invoice_id, 6, '0', STR_PAD_LEFT)),
            'invoice_type' => $invoice->invoice_type,
            'invoice_date' => $invoice->invoice_date,
            'due_date' => $invoice->due_date,
            'amount' => (int) $invoice->amount,
            'formatted_amount' => '₱' . number_format($invoice->amount / 100.0, 2),
            'status' => $invoice->status,
            'payment_date' => $invoice->payment_date,
            'payment_method' => $invoice->payment_method,
            'notes' => $invoice->notes,
            'customer' => $invoice->customer_name ?? 'N/A',
            'tracking_number' => $invoice->tracking_number,
            'receiver_name' => $invoice->receiver_name,
            'receiver_address' => $invoice->receiver_address,
            'quote_amount' => $invoice->quote_amount ? (int) $invoice->quote_amount : null,
            'days_overdue' => $invoice->status === 'pending' && Carbon::parse($invoice->due_date)->lt(Carbon::now())
                ? Carbon::now()->diffInDays(Carbon::parse($invoice->due_date)) : 0,
            'is_overdue' => $invoice->status === 'pending' && Carbon::parse($invoice->due_date)->lt(Carbon::now()),
            'order_details' => $orderDetails,
        ];

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function store(Request $request)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'order_id' => 'required|integer|exists:orders,order_id',
            'shipment_id' => 'nullable|integer|exists:shipments,shipment_id',
            'quote_id' => 'nullable|integer',
            'invoice_type' => 'nullable|string|in:standard,shipment,quote',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify order belongs to user
        $orderExists = DB::table('orders')
            ->where('order_id', $data['order_id'])
            ->where('organization_id', $orgUserId)
            ->exists();
        if (!$orderExists) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Generate unique invoice number
        $invoiceNumber = UserHelper::generateInvoiceNumber();

        $invoiceData = [
            'order_id' => $data['order_id'],
            'invoice_number' => $invoiceNumber,
            'shipment_id' => $data['shipment_id'] ?? null,
            'quote_id' => $data['quote_id'] ?? null,
            'invoice_type' => $data['invoice_type'] ?? 'standard',
            'invoice_date' => Carbon::now(),
            'due_date' => isset($data['due_date']) ? Carbon::parse($data['due_date']) : Carbon::now()->addDays(30),
            'amount' => (int) round($data['amount'] * 100),
            'status' => 'pending',
            'notes' => $data['notes'] ?? null,
        ];

        $invoice = Invoice::create($invoiceData);

        return response()->json([
            'message' => 'Invoice created successfully',
            'invoice_id' => $invoice->invoice_id,
            'invoice_number' => $invoice->invoice_number,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function updateStatus(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'status' => 'required|string|in:pending,paid,overdue,cancelled',
            'payment_method' => 'nullable|string|max:50',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify invoice belongs to user via order
        $invoice = Invoice::whereHas('order', function($q) use ($orgUserId) {
            $q->where('organization_id', $orgUserId);
        })->find($id);
        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $updateData = ['status' => $data['status']];

        if ($data['status'] === 'paid') {
            $updateData['payment_date'] = isset($data['payment_date'])
                ? Carbon::parse($data['payment_date'])
                : Carbon::now();
            $updateData['payment_method'] = $data['payment_method'] ?? null;
        }

        if (isset($data['notes'])) {
            $updateData['notes'] = $data['notes'];
        }

        $invoice->update($updateData);

        return response()->json(['message' => 'Invoice status updated successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function markAsPaid(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'payment_method' => 'required|string|max:50',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify invoice belongs to user via order
        $invoice = Invoice::whereHas('order', function($q) use ($orgUserId) {
            $q->where('organization_id', $orgUserId);
        })->find($id);
        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $paymentDate = isset($data['payment_date'])
            ? Carbon::parse($data['payment_date'])
            : Carbon::now();

        $invoice->markAsPaid($data['payment_method'], $paymentDate);

        if (isset($data['notes'])) {
            $invoice->update(['notes' => $data['notes']]);
        }

        return response()->json(['message' => 'Invoice marked as paid successfully'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function createFromShipment(Request $request, int $shipmentId)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        // Verify shipment belongs to user via order
        $shipment = Shipment::with('order')->whereHas('order', function($q) use ($orgUserId) {
            $q->where('organization_id', $orgUserId);
        })->find($shipmentId);
        if (!$shipment) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Check if invoice already exists for this shipment
        $existingInvoice = Invoice::where('shipment_id', $shipmentId)->first();
        if ($existingInvoice) {
            return response()->json([
                'message' => 'Invoice already exists for this shipment',
                'invoice_id' => $existingInvoice->invoice_id,
            ], 400)->header('Access-Control-Allow-Origin', '*');
        }

        $additionalData = $request->only(['due_date', 'notes']);
        $invoice = Invoice::createFromShipment($shipment, $additionalData);

        return response()->json([
            'message' => 'Invoice created from shipment successfully',
            'invoice_id' => $invoice->invoice_id,
            'invoice_number' => $invoice->invoice_number,
        ], 201)->header('Access-Control-Allow-Origin', '*');
    }

    public function updateOverdueStatuses()
    {
        $updatedCount = Invoice::updateOverdueStatuses();

        return response()->json([
            'message' => 'Overdue statuses updated',
            'updated_count' => $updatedCount,
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function getDashboardMetrics()
    {
        $totalUnpaid = Invoice::getTotalUnpaid();
        $recentInvoices = Invoice::getRecentInvoices(5);
        $overdueInvoices = Invoice::getOverdueInvoices();

        return response()->json([
            'data' => [
                'total_unpaid' => $totalUnpaid,
                'formatted_total_unpaid' => '₱' . number_format($totalUnpaid / 100.0, 2),
                'overdue_count' => $overdueInvoices->count(),
                'overdue_amount' => $overdueInvoices->sum('amount'),
                'recent_invoices' => $recentInvoices->map(function ($invoice) {
                    return [
                        'id' => $invoice->invoice_id,
                        'invoice_number' => $invoice->invoice_number,
                        'amount' => $invoice->amount,
                        'formatted_amount' => $invoice->formatted_amount,
                        'status' => $invoice->status,
                        'invoice_date' => $invoice->invoice_date,
                        'due_date' => $invoice->due_date,
                        'customer' => $invoice->order->user->username ?? 'N/A',
                        'tracking_number' => $invoice->shipment->tracking_number ?? null,
                    ];
                }),
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }
}