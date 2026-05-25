import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const MERCHANT_PLATFORM_URL = process.env.MERCHANT_PLATFORM_URL || 'http://localhost:4000';
const CROSS_AUTH_SECRET = process.env.CROSS_AUTH_SECRET || 'change-this-shared-secret-in-prod';

async function getMerchantPlatformToken(email: string): Promise<string> {
  const { createHmac } = await import('node:crypto');

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: email, iat: now, exp: now + 3600, iss: 'receipts-platform',
  })).toString('base64url');

  const hmac = createHmac('sha256', CROSS_AUTH_SECRET);
  hmac.update(`${header}.${payload}`);
  const signature = hmac.digest('base64url');
  const crossToken = `${header}.${payload}.${signature}`;

  const response = await fetch(`${MERCHANT_PLATFORM_URL}/api/auth/cross-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ crossToken, email }),
  });

  if (!response.ok) throw new Error('Cross-auth failed');
  const data = await response.json();
  return data.token;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = await getMerchantPlatformToken(session.user.email);
    const response = await fetch(`${MERCHANT_PLATFORM_URL}/api/privacy`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: 'Privacy settings unavailable' }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const token = await getMerchantPlatformToken(session.user.email);

    const response = await fetch(`${MERCHANT_PLATFORM_URL}/api/privacy/consent`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 502 });
  }
}
