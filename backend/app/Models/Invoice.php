<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class Invoice extends Model
{
    protected $table = 'invoices';
    protected $primaryKey = 'invoice_id';
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'shipment_id',
        'quote_id',
        'invoice_type',
        'invoice_date',
        'due_date',
        'amount',
        'status',
        'payment_date',
        'payment_method',
        'notes',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'payment_date' => 'date',
        'amount' => 'integer',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_PAID = 'paid';
    const STATUS_OVERDUE = 'overdue';
    const STATUS_CANCELLED = 'cancelled';

    // Invoice type constants
    const TYPE_STANDARD = 'standard';
    const TYPE_SHIPMENT = 'shipment';
    const TYPE_QUOTE = 'quote';

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id', 'order_id');
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class, 'quote_id', 'quote_id');
    }

    // Accessors
    public function getAmountInDollarsAttribute(): float
    {
        return $this->amount / 100.0;
    }

    public function getFormattedAmountAttribute(): string
    {
        return '₱' . number_format($this->amount / 100.0, 2);
    }

    public function getInvoiceNumberAttribute(): string
    {
        return 'INV-' . str_pad((string) $this->invoice_id, 6, '0', STR_PAD_LEFT);
    }

    public function getDaysOverdueAttribute(): int
    {
        if ($this->status !== self::STATUS_OVERDUE && $this->status !== self::STATUS_PENDING) {
            return 0;
        }

        return max(0, Carbon::now()->diffInDays($this->due_date, false));
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->status === self::STATUS_PENDING && Carbon::now()->gt($this->due_date);
    }

    // Mutators
    public function setAmountAttribute($value): void
    {
        // Convert dollars to cents for storage
        $this->attributes['amount'] = (int) round($value * 100);
    }

    // Methods
    public function markAsPaid(string $paymentMethod = null, Carbon $paymentDate = null): bool
    {
        return $this->update([
            'status' => self::STATUS_PAID,
            'payment_date' => $paymentDate ?? Carbon::now(),
            'payment_method' => $paymentMethod,
        ]);
    }

    public function markAsOverdue(): bool
    {
        return $this->update(['status' => self::STATUS_OVERDUE]);
    }

    public function cancel(string $reason = null): bool
    {
        return $this->update([
            'status' => self::STATUS_CANCELLED,
            'notes' => $reason,
        ]);
    }

    // Static methods
    public static function createFromShipment(Shipment $shipment, array $additionalData = []): self
    {
        // Calculate amount from shipment charges or related quote
        $amount = $shipment->charges;

        // Try to get pricing from related quote if available
        if ($shipment->order && $shipment->order->quote_id) {
            $quote = DB::table('quotes')->where('quote_id', $shipment->order->quote_id)->first();
            if ($quote && $quote->total_amount) {
                $amount = $quote->total_amount;
            }
        }

        $invoiceData = array_merge([
            'order_id' => $shipment->order_id,
            'shipment_id' => $shipment->shipment_id,
            'quote_id' => $shipment->order->quote_id ?? null,
            'invoice_type' => self::TYPE_SHIPMENT,
            'invoice_date' => Carbon::now(),
            'due_date' => Carbon::now()->addDays(30), // Net 30 terms
            'amount' => $amount,
            'status' => self::STATUS_PENDING,
        ], $additionalData);

        return self::create($invoiceData);
    }

    public static function getOverdueInvoices()
    {
        return self::where('status', self::STATUS_PENDING)
                   ->where('due_date', '<', Carbon::now())
                   ->get();
    }

    public static function updateOverdueStatuses(): int
    {
        return self::where('status', self::STATUS_PENDING)
                   ->where('due_date', '<', Carbon::now())
                   ->update(['status' => self::STATUS_OVERDUE]);
    }

    public static function getTotalUnpaid(): int
    {
        return self::whereIn('status', [self::STATUS_PENDING, self::STATUS_OVERDUE])
                   ->sum('amount');
    }

    public static function getRecentInvoices(int $limit = 10)
    {
        return self::with(['order', 'shipment'])
                   ->orderByDesc('invoice_date')
                   ->limit($limit)
                   ->get();
    }
}