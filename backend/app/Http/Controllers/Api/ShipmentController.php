<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\UserHelper;
use App\Models\Shipment;
use App\Models\Transport;
use App\Models\Order;
use App\Models\Invoice;
use App\Events\ShipmentStatusUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ShipmentController extends Controller
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

        $query = DB::table('shipments as s')
            ->leftJoin('orders as o', 's.order_id', '=', 'o.order_id')
            ->leftJoin('transport as t', 's.transport_id', '=', 't.transport_id')
            ->leftJoin('users as d', 't.driver_id', '=', 'd.user_id')
            ->where('o.organization_id', $orgUserId)
            ->select(
                's.shipment_id',
                's.tracking_number',
                's.receiver_name',
                's.status',
                's.creation_date',
                's.departure_date',
                's.origin_name',
                's.origin_address',
                'o.customer_name',
                'd.username as driver',
                't.registration_number'
            )
            ->orderByDesc('s.creation_date');

        if ($status && $status !== 'any') {
            $query->where('s.status', $status);
        }

        if ($search) {
            // Check if search is a PO number format (PO-00001)
            $orderIdFromPO = null;
            if (preg_match('/^PO-0*(\d+)$/i', $search, $matches)) {
                $orderIdFromPO = (int) $matches[1];
            }

            $query->where(function ($q) use ($search, $orderIdFromPO) {
                $q->where('s.tracking_number', 'like', "%$search%")
                  ->orWhere('s.receiver_name', 'like', "%$search%")
                  ->orWhere('o.customer_name', 'like', "%$search%");

                // Search by order_id if PO number format detected
                if ($orderIdFromPO !== null) {
                    $q->orWhere('o.order_id', $orderIdFromPO);
                }
            });
        }

        $rows = $query->limit($limit)->get();

        $data = $rows->map(function ($row) {
            return [
                'id' => (int) $row->shipment_id,
                'tracking_number' => $row->tracking_number,
                'receiver' => $row->receiver_name,
                'customer' => $row->customer_name ?? 'N/A',
                'driver' => $row->driver ?? 'N/A',
                'vehicle' => $row->registration_number ?? 'N/A',
                'status' => $row->status,
                'creation_date' => $row->creation_date,
                'departure_date' => $row->departure_date,
                'origin_name' => $row->origin_name,
                'origin_address' => $row->origin_address,
            ];
        });

        return response()->json([
            'data' => $data,
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function show(int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $shipment = DB::table('shipments as s')
            ->leftJoin('orders as o', 's.order_id', '=', 'o.order_id')
            ->leftJoin('transport as t', 's.transport_id', '=', 't.transport_id')
            ->leftJoin('users as d', 't.driver_id', '=', 'd.user_id')
            ->where('s.shipment_id', $id)
            ->where('o.organization_id', $orgUserId)
            ->select(
                's.*',
                'o.customer_name',
                'd.username as driver',
                't.registration_number',
                't.vehicle_type'
            )
            ->first();

        if (!$shipment) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $trackingHistory = DB::table('tracking_history')
            ->where('shipment_id', $id)
            ->orderByDesc('timestamp')
            ->get();

        $data = [
            'id' => (int) $shipment->shipment_id,
            'tracking_number' => $shipment->tracking_number,
            'receiver_name' => $shipment->receiver_name,
            'receiver_contact' => $shipment->receiver_contact ?? 'N/A',
            'receiver_address' => $shipment->receiver_address,
            'origin_name' => $shipment->origin_name,
            'origin_address' => $shipment->origin_address,
            'destination_name' => $shipment->destination_name,
            'destination_address' => $shipment->destination_address,
            'charges' => (int) $shipment->charges,
            'status' => $shipment->status,
            'creation_date' => $shipment->creation_date,
            'departure_date' => $shipment->departure_date,
            'customer' => $shipment->customer_name ?? 'N/A',
            'driver' => $shipment->driver ?? 'N/A',
            'vehicle' => $shipment->registration_number ?? 'N/A',
            'vehicle_type' => $shipment->vehicle_type ?? 'N/A',
            'tracking_history' => $trackingHistory->map(function($item) {
                return [
                    'id' => (int) $item->tracking_history_id,
                    'timestamp' => $item->timestamp,
                    'location' => $item->location,
                    'status' => $item->status,
                    'details' => $item->details,
                ];
            }),
        ];

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function createFromOrder(Request $request, int $orderId)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $data = $request->all();
        $validator = Validator::make($data, [
            'transport_id' => 'required|integer|exists:transport,transport_id',
            'receiver_name' => 'required|string|max:255',
            'receiver_contact' => 'required|string|max:50',
            'receiver_email' => 'nullable|email|max:255',
            'receiver_address' => 'required|string',
            'origin_name' => 'required|string|max:255',
            'origin_address' => 'required|string',
            'destination_name' => 'required|string|max:255',
            'destination_address' => 'required|string',
            'charges' => 'required|integer|min:0',
            'departure_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $order = DB::table('orders')
            ->where('order_id', $orderId)
            ->where('organization_id', $orgUserId)
            ->first();
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        if ($order->order_status !== 'fulfilled') {
            return response()->json(['message' => 'Order must be fulfilled before creating shipment'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $existingShipment = DB::table('shipments')->where('order_id', $orderId)->exists();
        if ($existingShipment) {
            return response()->json(['message' => 'Shipment already exists for this order'], 400)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $trackingNumber = $this->generateTrackingNumber();

        $shipmentId = DB::table('shipments')->insertGetId([
            'tracking_number' => $trackingNumber,
            'receiver_name' => $data['receiver_name'],
            'receiver_contact' => $data['receiver_contact'],
            'receiver_email' => $data['receiver_email'] ?? null,
            'receiver_address' => $data['receiver_address'],
            'origin_name' => $data['origin_name'],
            'origin_address' => $data['origin_address'],
            'destination_name' => $data['destination_name'],
            'destination_address' => $data['destination_address'],
            'charges' => $data['charges'],
            'status' => 'pending',
            'departure_date' => $data['departure_date'] ?? null,
            'order_id' => $orderId,
            'transport_id' => $data['transport_id'],
        ], 'shipment_id');

        DB::table('tracking_history')->insert([
            'shipment_id' => $shipmentId,
            'location' => $data['origin_name'],
            'status' => 'pending',
            'details' => 'Shipment created',
        ]);

        // Send tracking email if receiver email is provided
        if (!empty($data['receiver_email'])) {
            try {
                // Note: charges come from frontend in pesos (e.g., 336), not centavos
                $chargesInPesos = $data['charges'];

                $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

                $emailBody = "Hello {$data['receiver_name']},\n\n";
                $emailBody .= "Your shipment has been created and is ready for dispatch!\n\n";
                $emailBody .= "Tracking Number: {$trackingNumber}\n";
                $emailBody .= "Destination: {$data['destination_name']}\n";
                $emailBody .= "Estimated Charges: ₱" . number_format($chargesInPesos, 2) . "\n\n";
                $emailBody .= "Track Your Shipment:\n";
                $emailBody .= "Visit our website: {$frontendUrl}\n";
                $emailBody .= "Enter your tracking number on the landing page to see real-time updates.\n\n";
                $emailBody .= "If you have any questions, please contact us.\n\n";
                $emailBody .= "Best regards,\nLogiSync Team\nDavao City, Philippines";

                \Mail::raw($emailBody, function ($message) use ($data, $trackingNumber) {
                    $message->to($data['receiver_email'])
                        ->subject("LogiSync - Shipment Created - Tracking #{$trackingNumber}");
                });
            } catch (\Exception $e) {
                // Log error but don't fail the shipment creation
                \Log::error('Failed to send tracking email: ' . $e->getMessage());
            }
        }

        // Send SMS notification if receiver contact is provided
        if (!empty($data['receiver_contact'])) {
            try {
                \Log::info('Attempting to send SMS', [
                    'receiver_contact' => $data['receiver_contact'],
                    'receiver_name' => $data['receiver_name'],
                    'tracking_number' => $trackingNumber
                ]);

                $smsMessage = "Hello {$data['receiver_name']}! Your shipment #{$trackingNumber} is ready for dispatch to {$data['destination_name']}. Track at logisync.com -LogiSync";

                $smsSent = $this->sendSMS($data['receiver_contact'], $smsMessage);

                if ($smsSent) {
                    \Log::info('SMS sent successfully to ' . $data['receiver_contact']);
                } else {
                    \Log::warning('SMS sending returned false for ' . $data['receiver_contact']);
                }
            } catch (\Exception $e) {
                // Log error but don't fail the shipment creation
                \Log::error('Failed to send SMS notification: ' . $e->getMessage());
            }
        } else {
            \Log::info('No receiver contact provided, skipping SMS notification');
        }

        return response()->json([
            'message' => 'Shipment created successfully',
            'shipment_id' => $shipmentId,
            'tracking_number' => $trackingNumber,
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
            'status' => 'required|string|in:pending,in_transit,out_for_delivery,delivered,cancelled',
            'location' => 'required|string|max:255',
            'details' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify shipment belongs to user via order
        $shipment = DB::table('shipments as s')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('s.shipment_id', $id)
            ->where('o.organization_id', $orgUserId)
            ->select('s.*')
            ->first();
        if (!$shipment) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Store old status for event
        $oldStatus = $shipment->status;
        $newStatus = $data['status'];

        DB::table('shipments')->where('shipment_id', $id)->update([
            'status' => $newStatus,
        ]);

        DB::table('tracking_history')->insert([
            'shipment_id' => $id,
            'location' => $data['location'],
            'status' => $newStatus,
            'details' => $data['details'] ?? null,
        ]);

        // Auto-generate invoice when shipment is delivered
        if ($newStatus === 'delivered') {
            $this->createInvoiceForDeliveredShipment($id);
        }

        // Broadcast real-time status update
        $shipmentModel = Shipment::find($id);
        if ($shipmentModel) {
            event(new ShipmentStatusUpdated($shipmentModel, $oldStatus, $newStatus, 'admin'));
        }

        return response()->json(['message' => 'Shipment status updated'])
            ->header('Access-Control-Allow-Origin', '*');
    }

    public function track(string $trackingNumber)
    {
        $shipment = DB::table('shipments as s')
            ->leftJoin('transport as t', 's.transport_id', '=', 't.transport_id')
            ->leftJoin('users as d', 't.driver_id', '=', 'd.user_id')
            ->select(
                's.shipment_id',
                's.tracking_number',
                's.receiver_name',
                's.destination_name',
                's.destination_address',
                's.status',
                's.creation_date',
                's.departure_date',
                'd.username as driver',
                't.registration_number'
            )
            ->where('s.tracking_number', $trackingNumber)
            ->first();

        if (!$shipment) {
            return response()->json(['message' => 'Tracking number not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        $trackingHistory = DB::table('tracking_history')
            ->where('shipment_id', $shipment->shipment_id)
            ->orderBy('timestamp', 'asc')
            ->get();

        $data = [
            'tracking_number' => $shipment->tracking_number,
            'receiver_name' => $shipment->receiver_name,
            'destination' => $shipment->destination_name,
            'destination_address' => $shipment->destination_address,
            'current_status' => $shipment->status,
            'creation_date' => $shipment->creation_date,
            'departure_date' => $shipment->departure_date,
            'driver' => $shipment->driver ?? 'Not assigned',
            'vehicle' => $shipment->registration_number ?? 'Not assigned',
            'tracking_history' => $trackingHistory->map(function($item) {
                return [
                    'timestamp' => $item->timestamp,
                    'location' => $item->location,
                    'status' => $item->status,
                    'details' => $item->details,
                ];
            }),
        ];

        return response()->json(['data' => $data])
            ->header('Access-Control-Allow-Origin', '*');
    }

    private function generateTrackingNumber(): string
    {
        do {
            $trackingNumber = 'LS' . strtoupper(uniqid()) . random_int(100, 999);
        } while (DB::table('shipments')->where('tracking_number', $trackingNumber)->exists());

        return $trackingNumber;
    }

    private function createInvoiceForDeliveredShipment(int $shipmentId): void
    {
        try {
            // Check if invoice already exists for this shipment
            $existingInvoice = Invoice::where('shipment_id', $shipmentId)->first();
            if ($existingInvoice) {
                \Log::info('Invoice already exists for shipment', ['shipment_id' => $shipmentId, 'invoice_id' => $existingInvoice->invoice_id]);
                return; // Invoice already exists
            }

            // Get shipment with order relationship
            $shipment = Shipment::with('order')->find($shipmentId);
            if (!$shipment) {
                \Log::error('Shipment not found for invoice creation', ['shipment_id' => $shipmentId]);
                return;
            }

            if (!$shipment->order) {
                \Log::error('No order found for shipment during invoice creation', ['shipment_id' => $shipmentId]);
                return;
            }

            \Log::info('Creating invoice for delivered shipment', [
                'shipment_id' => $shipmentId,
                'order_id' => $shipment->order_id,
                'charges' => $shipment->charges
            ]);

            // Create invoice automatically with Net 30 terms
            $invoice = Invoice::createFromShipment($shipment, [
                'notes' => 'Auto-generated invoice upon delivery completion'
            ]);

            \Log::info('Invoice created successfully for delivered shipment', [
                'shipment_id' => $shipmentId,
                'invoice_id' => $invoice->invoice_id,
                'invoice_number' => $invoice->invoice_number
            ]);

        } catch (\Exception $e) {
            // Log error but don't fail the shipment update
            \Log::error('Failed to create invoice for delivered shipment: ' . $e->getMessage(), [
                'shipment_id' => $shipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    // GPS Tracking Methods
    public function updateLocation(Request $request, int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        $validator = Validator::make($request->all(), [
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'driver_id' => 'required|integer',
            'speed' => 'nullable|numeric|min:0',
            'accuracy' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Verify shipment belongs to user via order
        $shipment = DB::table('shipments as s')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('s.shipment_id', $id)
            ->where('o.organization_id', $orgUserId)
            ->select('s.*')
            ->first();
        if (!$shipment) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Store GPS location
        DB::table('gps_locations')->insert([
            'shipment_id' => $id,
            'driver_id' => $request->driver_id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'speed' => $request->speed,
            'accuracy' => $request->accuracy,
            'recorded_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Location updated successfully',
            'location' => [
                'latitude' => (float) $request->latitude,
                'longitude' => (float) $request->longitude,
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function getLocation(int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        // Verify shipment belongs to user via order
        $shipmentExists = DB::table('shipments as s')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('s.shipment_id', $id)
            ->where('o.organization_id', $orgUserId)
            ->exists();
        if (!$shipmentExists) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get latest GPS location for shipment
        $location = DB::table('gps_locations')
            ->where('shipment_id', $id)
            ->orderByDesc('recorded_at')
            ->first();

        if (!$location) {
            return response()->json([
                'message' => 'No GPS data available',
                'location' => null
            ])->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json([
            'location' => [
                'latitude' => (float) $location->latitude,
                'longitude' => (float) $location->longitude,
                'speed' => (float) $location->speed,
                'accuracy' => (float) $location->accuracy,
                'recorded_at' => $location->recorded_at,
            ]
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function getLocationHistory(int $id)
    {
        $userId = request()->header('X-User-Id');
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized - User ID required'], 401);
        }

        $orgUserId = UserHelper::getOrganizationUserId($userId);
        // Verify shipment belongs to user via order
        $shipmentExists = DB::table('shipments as s')
            ->join('orders as o', 's.order_id', '=', 'o.order_id')
            ->where('s.shipment_id', $id)
            ->where('o.organization_id', $orgUserId)
            ->exists();
        if (!$shipmentExists) {
            return response()->json(['message' => 'Shipment not found'], 404)
                ->header('Access-Control-Allow-Origin', '*');
        }

        // Get GPS tracking history for shipment
        $locations = DB::table('gps_locations')
            ->where('shipment_id', $id)
            ->orderBy('recorded_at')
            ->get();

        $data = $locations->map(function ($loc) {
            return [
                'latitude' => (float) $loc->latitude,
                'longitude' => (float) $loc->longitude,
                'speed' => (float) $loc->speed,
                'recorded_at' => $loc->recorded_at,
            ];
        });

        return response()->json([
            'history' => $data,
            'count' => $data->count()
        ])->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * Send SMS notification using Semaphore API
     *
     * @param string $phoneNumber - Philippine mobile number (e.g., 09123456789 or +639123456789)
     * @param string $message - SMS message content
     * @return bool - Success status
     */
    private function sendSMS(string $phoneNumber, string $message): bool
    {
        // Get Semaphore API key from environment
        $apiKey = env('SEMAPHORE_API_KEY');

        if (empty($apiKey)) {
            \Log::warning('Semaphore API key not configured. SMS not sent.');
            return false;
        }

        // Format phone number to Philippine format (+63)
        $phoneNumber = $this->formatPhoneNumber($phoneNumber);

        try {
            $ch = curl_init();
            $parameters = [
                'apikey' => $apiKey,
                'number' => $phoneNumber,
                'message' => $message,
                'sendername' => env('SEMAPHORE_SENDER_NAME', 'LogiSync')
            ];

            curl_setopt($ch, CURLOPT_URL, 'https://api.semaphore.co/api/v4/messages');
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($parameters));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);

            $output = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                \Log::info('SMS sent successfully', ['phone' => $phoneNumber]);
                return true;
            } else {
                \Log::error('Failed to send SMS', [
                    'phone' => $phoneNumber,
                    'http_code' => $httpCode,
                    'response' => $output
                ]);
                return false;
            }
        } catch (\Exception $e) {
            \Log::error('SMS sending exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Format phone number to Philippine international format
     *
     * @param string $phoneNumber
     * @return string
     */
    private function formatPhoneNumber(string $phoneNumber): string
    {
        // Remove spaces, dashes, and parentheses
        $phoneNumber = preg_replace('/[\s\-\(\)]/', '', $phoneNumber);

        // If starts with 0, replace with +63
        if (substr($phoneNumber, 0, 1) === '0') {
            $phoneNumber = '+63' . substr($phoneNumber, 1);
        }
        // If starts with 63 but no +, add +
        elseif (substr($phoneNumber, 0, 2) === '63') {
            $phoneNumber = '+' . $phoneNumber;
        }
        // If doesn't start with + or 63, assume it's a local number without 0
        elseif (substr($phoneNumber, 0, 1) !== '+') {
            $phoneNumber = '+63' . $phoneNumber;
        }

        return $phoneNumber;
    }
}