export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };

  // Only use driver auth for driver-specific API routes
  const isDriverRoute = window.location.pathname.startsWith('/driver');

  if (isDriverRoute) {
    // Check for driver auth
    const driverAuth = localStorage.getItem("driver");
    if (driverAuth) {
      try {
        const parsed = JSON.parse(driverAuth);
        if (parsed.id) {
          headers["X-User-Id"] = String(parsed.id);
          console.log('[API] Sending request with driver user_id:', parsed.id);
          return headers;
        }
      } catch (e) {
        console.error("Failed to parse driver auth", e);
      }
    }
  }

  // Check for regular user auth
  const auth = localStorage.getItem("auth");
  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      if (parsed.user?.user_id) {
        headers["X-User-Id"] = String(parsed.user.user_id);
        console.log('[API] Sending request with user_id:', parsed.user.user_id);
      } else {
        console.warn('[API] No user_id found in auth data:', parsed);
      }
    } catch (e) {
      console.error("Failed to parse auth", e);
    }
  } else {
    console.warn('[API] No auth data in localStorage');
  }
  return headers;
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Handle validation errors (422 status)
    if (data?.errors && typeof data.errors === 'object') {
      const firstError = Object.values(data.errors)[0];
      const message = Array.isArray(firstError) ? firstError[0] : firstError;
      throw new Error(message);
    }
    const message = data?.message || "Request failed";
    console.error(`[API POST ${path}] Failed with status ${res.status}:`, data);
    throw new Error(message);
  }
  return data;
}

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || "Request failed";
    console.error(`[API GET ${path}] Failed with status ${res.status}:`, data);
    throw new Error(message);
  }
  return data;
}

export async function apiPatch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

// Shipment API functions
export async function getShipments(params = {}) {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.status && params.status !== 'any') qs.set('status', params.status)
  if (params.limit) qs.set('limit', params.limit)
  const url = '/api/shipments' + (qs.toString() ? `?${qs.toString()}` : '')
  return apiGet(url)
}

export async function getShipment(id) {
  return apiGet(`/api/shipments/${id}`)
}

export async function createShipmentFromOrder(orderId, shipmentData) {
  return apiPost(`/api/orders/${orderId}/shipments`, shipmentData)
}

export async function updateShipmentStatus(shipmentId, statusData) {
  return apiPatch(`/api/shipments/${shipmentId}/status`, statusData)
}

export async function trackShipment(trackingNumber) {
  return apiGet(`/api/track/${trackingNumber}`)
}

export async function getTransports() {
  return apiGet('/api/transport')
}

// Invoice API functions
export async function getInvoices(params = {}) {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.status && params.status !== 'any') qs.set('status', params.status)
  if (params.limit) qs.set('limit', params.limit)
  const url = '/api/invoices' + (qs.toString() ? `?${qs.toString()}` : '')
  return apiGet(url)
}

export async function getInvoice(id) {
  return apiGet(`/api/invoices/${id}`)
}

export async function createInvoiceFromShipment(shipmentId, data = {}) {
  return apiPost(`/api/shipments/${shipmentId}/invoice`, data)
}

export async function markInvoiceAsPaid(invoiceId, paymentData) {
  return apiPatch(`/api/invoices/${invoiceId}/mark-paid`, paymentData)
}

export async function updateInvoiceStatus(invoiceId, statusData) {
  return apiPatch(`/api/invoices/${invoiceId}/status`, statusData)
}
