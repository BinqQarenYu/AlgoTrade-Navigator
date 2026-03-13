
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'app-settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function GET() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return NextResponse.json({ found: false, settings: null });
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return NextResponse.json({ found: true, settings: JSON.parse(data) });
  } catch (error) {
    console.error('Failed to read settings file:', error);
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const settings = await request.json();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to write settings file:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
