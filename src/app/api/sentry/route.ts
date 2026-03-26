import { NextResponse } from 'next/server';
import { headlessSentry } from '@/lib/headless-sentry';

export async function GET() {
    try {
        return NextResponse.json(headlessSentry.getStatus());
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { action } = await req.json();
        
        if (action === 'start') {
            headlessSentry.start();
            return NextResponse.json({ success: true, status: headlessSentry.getStatus() });
        } else if (action === 'stop') {
            headlessSentry.stop();
            return NextResponse.json({ success: true, status: headlessSentry.getStatus() });
        }
        
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const config = await req.json();
        headlessSentry.updateConfig(config);
        return NextResponse.json({ success: true, status: headlessSentry.getStatus() });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
