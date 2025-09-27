<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class InvoiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();

        // Get some sample shipments and orders to create invoices for
        $shipments = DB::table('shipments')
            ->leftJoin('orders', 'shipments.order_id', '=', 'orders.order_id')
            ->select('shipments.shipment_id', 'shipments.charges', 'orders.order_id', 'orders.user_id')
            ->limit(10)
            ->get();

        foreach ($shipments as $index => $shipment) {
            $invoiceDate = $now->copy()->subDays(rand(1, 30));
            $dueDate = $invoiceDate->copy()->addDays(30); // Net 30 terms

            // Determine status based on due date
            $status = 'pending';
            $paymentDate = null;
            $paymentMethod = null;

            if (rand(0, 100) < 60) { // 60% chance of being paid
                $status = 'paid';
                $paymentDate = $invoiceDate->copy()->addDays(rand(1, 35));
                $paymentMethods = ['Cash', 'Bank Transfer', 'GCash', 'Card', 'Check'];
                $paymentMethod = $paymentMethods[array_rand($paymentMethods)];
            } elseif ($dueDate->lt($now)) { // If unpaid and past due date
                $status = 'overdue';
            }

            $invoiceData = [
                'order_id' => $shipment->order_id,
                'shipment_id' => $shipment->shipment_id,
                'quote_id' => null,
                'invoice_type' => 'shipment',
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'amount' => $shipment->charges ?: rand(500, 5000) * 100, // Convert to cents
                'status' => $status,
                'payment_date' => $paymentDate,
                'payment_method' => $paymentMethod,
                'notes' => $status === 'paid'
                    ? 'Payment received via ' . $paymentMethod
                    : ($status === 'overdue' ? 'Payment overdue - follow up required' : null),
                'created_at' => $invoiceDate,
                'updated_at' => $paymentDate ?: $invoiceDate,
            ];

            // Remove created_at and updated_at for raw insert
            unset($invoiceData['created_at'], $invoiceData['updated_at']);
            DB::table('invoices')->insert($invoiceData);
        }

        // Create a few additional sample invoices with different types
        $additionalInvoices = [
            [
                'order_id' => $shipments->first()->order_id ?? 1,
                'shipment_id' => null,
                'quote_id' => null,
                'invoice_type' => 'standard',
                'invoice_date' => $now->copy()->subDays(45),
                'due_date' => $now->copy()->subDays(15), // Overdue
                'amount' => 125000, // ₱1,250.00
                'status' => 'overdue',
                'payment_date' => null,
                'payment_method' => null,
                'notes' => 'Custom invoice - payment overdue by 15 days',
                'created_at' => $now->copy()->subDays(45),
                'updated_at' => $now->copy()->subDays(45),
            ],
            [
                'order_id' => $shipments->skip(1)->first()->order_id ?? 2,
                'shipment_id' => null,
                'quote_id' => null,
                'invoice_type' => 'quote',
                'invoice_date' => $now->copy()->subDays(5),
                'due_date' => $now->copy()->addDays(25),
                'amount' => 75000, // ₱750.00
                'status' => 'pending',
                'payment_date' => null,
                'payment_method' => null,
                'notes' => 'Invoice based on approved quote',
                'created_at' => $now->copy()->subDays(5),
                'updated_at' => $now->copy()->subDays(5),
            ],
        ];

        foreach ($additionalInvoices as $invoice) {
            // Remove created_at and updated_at for raw insert
            unset($invoice['created_at'], $invoice['updated_at']);
            DB::table('invoices')->insert($invoice);
        }

        $this->command->info('Invoice seeder completed - created sample invoices with various statuses');
    }
}