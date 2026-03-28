import { NextResponse } from 'next/server';
import { isChildProcessAlive, killChildProcess, spawnChildProcess } from '@/lib/child-spawner';

export async function GET() {
  return NextResponse.json({ running: isChildProcessAlive() });
}

export async function POST(req: Request) {
  try {
    const { action } = await req.json();

    if (action === 'stop' || action === 'restart') {
      killChildProcess();
    }

    if (action === 'start' || action === 'restart') {
      if (action === 'restart') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const success = spawnChildProcess();
      if (!success) {
        return NextResponse.json({ error: 'child-node directory not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: `Child node ${action}ed successfully.` });
    }

    return NextResponse.json({ success: true, message: `Child node stopped.` });
  } catch (err: any) {
    console.error('Failed to control child node:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
