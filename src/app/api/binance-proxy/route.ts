
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';

const BINANCE_API_URL = 'https://fapi.binance.com';

// Allow-list of permitted Binance API endpoints and methods.
// This prevents the proxy from being used to access unauthorized endpoints.
const ALLOWED_ENDPOINTS: Record<string, string[]> = {
  '/fapi/v1/ping': ['GET'],
  '/fapi/v1/time': ['GET'],
  '/fapi/v1/exchangeInfo': ['GET'],
  '/fapi/v1/klines': ['GET'],
  '/fapi/v2/account': ['GET'],
  '/fapi/v2/positionRisk': ['GET'],
  '/fapi/v1/order': ['POST'],
};

// This is the core proxy logic. It forwards requests from the client to the Binance API.
export async function POST(request: NextRequest) {
  try {
    const { path, method, body, apiKey, secretKey } = await request.json();

    if (!path || !method) {
      return NextResponse.json({ error: 'Missing path or method' }, { status: 400 });
    }

    // Server-side input validation
    const allowedMethods = ALLOWED_ENDPOINTS[path];
    if (!allowedMethods || !allowedMethods.includes(method.toUpperCase())) {
      console.warn(`[SECURITY] Unauthorized proxy request: ${method} ${path}`);
      return NextResponse.json({ error: 'Unauthorized endpoint or method' }, { status: 403 });
    }

    // Use keys from the request body, or fall back to environment variables.
    const finalApiKey = apiKey || process.env.BINANCE_API_KEY;
    const finalSecretKey = secretKey || process.env.BINANCE_SECRET_KEY;

    // Public endpoints don't strictly require API keys for signing, 
    // although our proxy usually expects them for consistent signature generation.
    // Endpoints like /fapi/v1/ping, /klines, etc. can be called without keys.
    const isPublicEndpoint = path.startsWith('/fapi/v1/') && !path.includes('order') && !path.includes('account');

    if (!isPublicEndpoint && (!finalApiKey || !finalSecretKey)) {
      return NextResponse.json({ error: 'API keys are not configured on the server.' }, { status: 500 });
    }

    const timestamp = Date.now();
    let queryString = `timestamp=${timestamp}`;

    // Append additional body params to the query string for the signature
    if (body && typeof body === 'object') {
        const params = new URLSearchParams(body).toString();
        if (params) {
            queryString += `&${params}`;
        }
    }
    
    // Only sign if we have keys. Public endpoints call without keys will have no signature.
    if (finalApiKey && finalSecretKey) {
        const signature = crypto
          .createHmac('sha256', finalSecretKey)
          .update(queryString)
          .digest('hex');
          
        queryString += `&signature=${signature}`;
    }

    const url = new URL(`${BINANCE_API_URL}${path}`);
    url.search = queryString;

    const options: RequestInit = {
      method,
      headers: {
        ...(finalApiKey ? { 'X-MBX-APIKEY': finalApiKey } : {}),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    };
    
    // Note: The proxy functionality for bypassing geo-restrictions is not implemented here.
    // In a real-world scenario, you would integrate a third-party proxy service here,
    // potentially using an agent with the fetch call.
    // For example: `agent: new HttpsProxyAgent(process.env.PROXY_URL)`
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s server timeout

    const response = await fetch(url.toString(), {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    const usedWeight = parseInt(response.headers.get('x-fapi-used-weight-1m') || '0', 10);

    if (!response.ok) {
        // Handle specific geo-blocking errors coming from our proxy
        if (data?.msg?.includes('restricted location')) {
             throw new Error(data.msg);
        }
        return NextResponse.json({ error: data.msg || 'Binance API error', code: data.code, usedWeight }, { status: response.status });
    }

    return NextResponse.json({ data, usedWeight });

  } catch (error: any) {
    console.error('[BINANCE PROXY ERROR]', error);
    return NextResponse.json({ error: 'An internal server error occurred in the proxy.' }, { status: 500 });
  }
}
