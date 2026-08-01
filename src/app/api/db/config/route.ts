export const runtime = 'nodejs';
import { NextResponse, type NextRequest } from 'next/server';
import { getStorageConfig, connectToDB } from '@/lib/db-service';

export async function GET() {
    try {
        const config = getStorageConfig();
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { newPath } = await request.json();
        if (!newPath) return NextResponse.json({ error: 'Path required' }, { status: 400 });

        // Change DB connection path
        await connectToDB(newPath);

        return NextResponse.json({ success: true, path: newPath });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
