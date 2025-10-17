import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Minimal Razorpay client for Deno fetch
const RAZORPAY_API = 'https://api.razorpay.com/v1';

async function razorpayRequest(path: string, method: string, body?: any) {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
  const auth = btoa(`${keyId}:${keySecret}`);

  const res = await fetch(`${RAZORPAY_API}${path}`, {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.description || json?.message || 'Razorpay request failed');
  }
  return json;
}

function makeCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '*';
  const requestHeaders = req.headers.get('access-control-request-headers');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
  };
  headers['Access-Control-Allow-Headers'] = requestHeaders
    ? requestHeaders
    : 'authorization, x-client-info, apikey, content-type';
  return headers;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    const cors = makeCorsHeaders(req);
    // 204 No Content is a safer preflight response with no body
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname; // /payments/create-order or /payments/verify

    // Parse JSON body once (supports supabase.functions.invoke at root path)
    let bodyData: any = null;
    if (req.method === 'POST') {
      try { bodyData = await req.json(); } catch (_) { bodyData = null; }
    }

    // Supabase admin client (optional). If not configured, skip DB writes.
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
      ? createClient(
          SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
      : null;

    // Handle both invoke (root) and REST path (/create-order)
    if ((pathname.endsWith('/payments') || pathname.endsWith('/create-order')) && req.method === 'POST') {
      const { amount, currency = 'INR', userId, expenseId, description } = bodyData || {};

      if (!amount || !userId) {
        const cors = makeCorsHeaders(req);
        return new Response(
          JSON.stringify({ success: false, message: 'amount and userId are required' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      // Create order at Razorpay (amount in paise)
      const order = await razorpayRequest('/orders', 'POST', {
        amount: Math.round(Number(amount) * 100),
        currency,
        receipt: `exp-${expenseId || 'na'}-${Date.now()}`,
        notes: { userId, expenseId, description }
      });

      // Record in payments table (optional if admin configured)
      if (supabaseAdmin) {
        await supabaseAdmin.from('payments').insert({
          user_id: userId,
          expense_id: expenseId || null,
          amount: amount,
          currency: currency,
          status: 'created',
          razorpay_order_id: order.id,
          notes: order.notes || {}
        });
      }

      const cors = makeCorsHeaders(req);
      return new Response(
        JSON.stringify({ success: true, order }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Verify supports invoke with action flag and REST path
    if ((pathname.endsWith('/payments') || pathname.endsWith('/verify')) && req.method === 'POST' && (bodyData?.action === 'verify' || pathname.endsWith('/verify'))) {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = bodyData || {};
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        const cors = makeCorsHeaders(req);
        return new Response(
          JSON.stringify({ success: false, message: 'Missing required fields' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      // Verify signature
      const expected = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ).then(key => crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(`${razorpay_order_id}|${razorpay_payment_id}`)
      )).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

      if (expected !== razorpay_signature) {
        await supabaseAdmin.from('payments').update({
          status: 'failed',
          razorpay_payment_id,
          razorpay_signature
        }).eq('razorpay_order_id', razorpay_order_id);

        const cors = makeCorsHeaders(req);
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid signature' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      if (supabaseAdmin) {
        const { data: updated, error } = await supabaseAdmin
          .from('payments')
          .update({
            status: 'captured',
            razorpay_payment_id,
            razorpay_signature,
            verified_at: new Date().toISOString()
          })
          .eq('razorpay_order_id', razorpay_order_id)
          .select()
          .single();

        if (error) console.error('payments update error:', error);
        
        // Send email notification with receipt (async, don't wait)
        if (updated && updated.user_id) {
          sendPaymentConfirmationEmail(supabaseAdmin, updated).catch(err => {
            console.error('Failed to send payment confirmation email:', err);
          });
        }
        
        const cors = makeCorsHeaders(req);
        return new Response(
          JSON.stringify({ success: true, payment: updated }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      } else {
        const cors = makeCorsHeaders(req);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Health
    if (pathname.endsWith('/health')) {
      const cors = makeCorsHeaders(req);
      return new Response(
        JSON.stringify({ status: 'OK', service: 'payments edge function', ts: new Date().toISOString() }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const cors = makeCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('payments function error:', err);
    const cors = makeCorsHeaders(req);
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
})