
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensures the function is always run on the server

export async function GET() {
  try {
    // This request is made from the server, so the IP resolved will be the server's outbound IP.
    const response = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to fetch server IP: ${response.statusText}`);
    }
    const data = await response.json();
    return NextResponse.json({ ip: data.ip });
  } catch (error) {
    console.error("Could not fetch server IP:", error);
    return NextResponse.json({ error: 'Failed to fetch server IP' }, { status: 500 });
  }
}
