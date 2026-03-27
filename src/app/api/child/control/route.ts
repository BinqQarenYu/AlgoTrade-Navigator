import { NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

let childProcess: ReturnType<typeof spawn> | null = null;

export async function GET() {
  // Returns true if the child instance is spawned and hasn't explicitly been killed
  return NextResponse.json({ running: childProcess !== null });
}

export async function POST(req: Request) {
  try {
    const { action } = await req.json();
    const childDir = path.join(process.cwd(), 'child-node');

    if (!fs.existsSync(childDir)) {
      return NextResponse.json({ error: 'child-node directory not found' }, { status: 404 });
    }

    if (action === 'stop' || action === 'restart') {
      if (childProcess) {
        childProcess.kill();
        childProcess = null;
      } else {
        // Fallback: kill any node process running child-node/index.js (Windows compatible)
        exec(`wmic process where "commandline like '%child-node\\\\index.js%'" call terminate`, (err) => {
            if (err) console.error("Could not forcibly terminate child nodes:", err);
        });
      }
    }

    if (action === 'start' || action === 'restart') {
      // Small delay on restart to ensure port/file locks clear
      if (action === 'restart') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('[MOTHER NODE] Spawning Sentry Child Node locally...');
      
      // Spawn standard Next.js child process
      childProcess = spawn('node', ['index.js'], {
        cwd: childDir,
        detached: true,
        stdio: 'ignore',
        windowsHide: true, // Keep it invisible on Windows
      });

      // Unref to let the Node process run independently of the Mother's terminal lock
      childProcess.unref();

      return NextResponse.json({ success: true, message: `Child node ${action}ed successfully.` });
    }

    return NextResponse.json({ success: true, message: `Child node stopped.` });
  } catch (err: any) {
    console.error('Failed to control child node:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
