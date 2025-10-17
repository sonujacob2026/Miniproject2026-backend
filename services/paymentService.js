// d:\Mini\Finance\src\services\paymentService.js
// Handles Razorpay checkout integration

import { supabase } from '../lib/supabase';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payments`;
// Use backend only if explicitly provided
const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || '';
// TEMP override to ensure correct Razorpay key is used
const RZP_KEY = 'rzp_test_RFR3bBfpbdvQzK';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Load Razorpay checkout script once
let razorpayScriptLoaded = false;
async function loadRazorpayScript() {
  if (razorpayScriptLoaded) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => { razorpayScriptLoaded = true; resolve(true); };
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Check if payment system is properly configured
function isPaymentSystemConfigured() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  
  // Check if we have valid configuration (not just placeholder values)
  // Valid if either: (Supabase + RZP key) OR (Backend URL + RZP key)
  const supabaseOk = supabaseUrl && supabaseKey && !supabaseUrl.includes('your_') && !supabaseKey.includes('your_');
  const backendOk = backendUrl && backendUrl.length > 0;
  return razorpayKey && !razorpayKey.includes('your_') && (supabaseOk || backendOk);
}

// Create order on backend (via invoke to avoid CORS)
export async function createOrder({ amount, userId, expenseId, description }) {
  try {
    // Check if payment system is properly configured
    if (!isPaymentSystemConfigured()) {
      throw new Error('Payment system not configured. Running in demo mode.');
    }

    // Prefer backend server if configured to avoid CORS on Edge Functions
    if (BACKEND_BASE) {
      console.info('[payments] using backend:', `${BACKEND_BASE}/api/payments/create-order`);
      const res = await fetch(`${BACKEND_BASE}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, userId, expenseId, description, currency: 'INR' })
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || 'Failed to create order');
      }
      const json = await res.json();
      return json;
    }

    // Prefer direct fetch to capture non-2xx body for debugging
    console.info('[payments] using supabase function:', 'payments');
    const { data: sessionData } = await supabase.auth.getSession();
    const bearer = sessionData?.session?.access_token || ANON_KEY;
    const res = await fetch(FUNCTIONS_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearer}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ amount, userId, expenseId, description, currency: 'INR' })
    });

    const contentType = res.headers.get('content-type') || '';
    let payload = null;
    if (contentType.includes('application/json')) {
      payload = await res.json().catch(() => null);
    } else {
      const text = await res.text().catch(() => '');
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = text;
      }
    }

    if (!res.ok) {
      const server = typeof payload === 'object' && payload ? payload : { message: String(payload || 'Failed to create order') };
      const parts = [
        server?.message,
        server?.debug?.stage && `stage: ${server.debug.stage}`,
        server?.debug?.rzp_error?.code && `rzp_code: ${server.debug.rzp_error.code}`,
        server?.debug?.rzp_error?.reason && `rzp_reason: ${server.debug.rzp_error.reason}`,
        server?.debug?.rzp_error?.field && `rzp_field: ${server.debug.rzp_error.field}`,
        (server?.debug?.http_status != null) && `http: ${server.debug.http_status}`,
      ].filter(Boolean);
      const msg = parts.join(' | ') || 'Failed to create order';
      console.error('payments:create_order error', { status: res.status, server });
      throw new Error(msg);
    }

    const json = typeof payload === 'object' && payload ? payload : {};
    if (json?.success && json?.order) return json;
    if (json?.id) return { success: true, order: json };
    console.error('payments:create_order unexpected payload', { status: res.status, payload });
    throw new Error(json?.message || 'Unexpected response from payments function');
  } catch (err) {
    console.error('createOrder error:', err);
    throw err;
  }
}

// Open Razorpay Checkout and verify payment
export async function payWithRazorpay({ order, user, expense }) {
  // Check if payment system is properly configured
  if (!isPaymentSystemConfigured()) {
    throw new Error('Payment gateway not configured. Running in demo mode.');
  }

  const scriptOk = await loadRazorpayScript();
  if (!scriptOk) throw new Error('Failed to load Razorpay');

  return new Promise((resolve, reject) => {
    const options = {
      key: RZP_KEY,
      amount: order.amount,
      currency: order.currency,
      name: 'ExpenseAI',
      description: expense?.description || 'Expense Payment',
      order_id: order.id,
      prefill: {
        name: user?.user_metadata?.full_name || '',
        email: user?.email || ''
      },
      notes: {
        expenseId: expense?.id || '',
        userId: user?.id || ''
      },
      theme: { color: '#22c55e' },
      handler: async (response) => {
        try {
          // Use backend verify when available
          if (BACKEND_BASE) {
            const res = await fetch(`${BACKEND_BASE}/api/payments/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
            const data = await res.json();
            if (!res.ok || !data?.success) return reject(new Error(data?.message || 'Verification failed'));
            resolve(data);
            return;
          }

          // Direct fetch to Edge Function to ensure we read error body
          const { data: sessionData } = await supabase.auth.getSession();
          const bearer = sessionData?.session?.access_token || ANON_KEY;
          const res = await fetch(FUNCTIONS_BASE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${bearer}`,
              'apikey': ANON_KEY,
            },
            body: JSON.stringify({ action: 'verify', ...response })
          });

          const contentType = res.headers.get('content-type') || '';
          let payload = null;
          if (contentType.includes('application/json')) {
            payload = await res.json().catch(() => null);
          } else {
            const text = await res.text().catch(() => '');
            try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
          }

          if (!res.ok) {
            const server = typeof payload === 'object' && payload ? payload : { message: String(payload || 'Verification failed') };
            const msg = server?.message || 'Verification failed';
            return reject(new Error(msg));
          }

          const json = typeof payload === 'object' && payload ? payload : {};
          if (!json?.success) return reject(new Error(json?.message || 'Verification failed'));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
    };

    // Debug: confirm which Razorpay key is used at runtime
    try { console.info('rzp key used at runtime:', RZP_KEY); } catch {}

    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}