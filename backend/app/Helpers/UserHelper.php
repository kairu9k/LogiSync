<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;

class UserHelper
{
    /**
     * Get the organization ID for filtering data.
     *
     * Returns the organization_id that the user belongs to.
     * All users (admin and team members) have an organization_id.
     *
     * @param int $userId The authenticated user's ID from X-User-Id header
     * @return int The organization_id to use for filtering organization data
     */
    public static function getOrganizationUserId(int $userId): int
    {
        $user = DB::table('users')
            ->where('user_id', $userId)
            ->select('organization_id')
            ->first();

        if (!$user || !$user->organization_id) {
            // Fallback - should not happen if migrations ran correctly
            return $userId;
        }

        return (int) $user->organization_id;
    }

    /**
     * Generate unique order number in format ORD-00001
     *
     * @return string
     */
    public static function generateOrderNumber(): string
    {
        do {
            // Get the latest order number
            $lastOrder = DB::table('orders')
                ->whereNotNull('order_number')
                ->orderByDesc('order_id')
                ->first();

            if ($lastOrder && $lastOrder->order_number) {
                // Extract number from ORD-00001 format
                $lastNumber = (int) substr($lastOrder->order_number, 4);
                $nextNumber = $lastNumber + 1;
            } else {
                $nextNumber = 1;
            }

            $orderNumber = 'ORD-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
        } while (DB::table('orders')->where('order_number', $orderNumber)->exists());

        return $orderNumber;
    }

    /**
     * Generate unique invoice number in format INV-000001
     *
     * @return string
     */
    public static function generateInvoiceNumber(): string
    {
        do {
            // Get the latest invoice number
            $lastInvoice = DB::table('invoices')
                ->whereNotNull('invoice_number')
                ->orderByDesc('invoice_id')
                ->first();

            if ($lastInvoice && $lastInvoice->invoice_number) {
                // Extract number from INV-000001 format
                $lastNumber = (int) substr($lastInvoice->invoice_number, 4);
                $nextNumber = $lastNumber + 1;
            } else {
                $nextNumber = 1;
            }

            $invoiceNumber = 'INV-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
        } while (DB::table('invoices')->where('invoice_number', $invoiceNumber)->exists());

        return $invoiceNumber;
    }

    /**
     * Generate unique quote number in format QTE-00001
     *
     * @return string
     */
    public static function generateQuoteNumber(): string
    {
        do {
            // Get the latest quote number
            $lastQuote = DB::table('quotes')
                ->whereNotNull('quote_number')
                ->orderByDesc('quote_id')
                ->first();

            if ($lastQuote && $lastQuote->quote_number) {
                // Extract number from QTE-00001 format
                $lastNumber = (int) substr($lastQuote->quote_number, 4);
                $nextNumber = $lastNumber + 1;
            } else {
                $nextNumber = 1;
            }

            $quoteNumber = 'QTE-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
        } while (DB::table('quotes')->where('quote_number', $quoteNumber)->exists());

        return $quoteNumber;
    }
}
