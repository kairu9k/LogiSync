export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function apiPatch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
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
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
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
