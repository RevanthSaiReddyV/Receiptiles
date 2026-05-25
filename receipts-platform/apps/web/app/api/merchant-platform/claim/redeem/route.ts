import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const MERCHANT_PLATFORM_URL = process.env.MERCHANT_PLATFORM_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { code } = body;

  if (!code) {
    return NextResponse.json({ error: 'Missing claim code' }, { status: 400 });
  }

  try {
    // First get or create a cross-auth token for this user
    const crossToken = await getCrossAuthToken(session.user.email, session.user.name || undefined);

    // Redeem the claim using the merchant platform token
    const response = await fetch(`${MERCHANT_PLATFORM_URL}/api/claim/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, userId: crossToken.userId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 });
  }
}

async function getCrossAuthToken(email: string, name?: string) {
  const sharedSecret = process.env.CROSS_AUTH_SECRET || 'change-this-shared-secret-in-prod';

  // Create a cross-auth token
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: email,
    iat: now,
    exp: now + 3600,
    iss: 'receipts-platform',
  })).toString('base64url');

  const { createHmac } = await import('node:crypto');
  const hmac = createHmac('sha256', sharedSecret);
  hmac.update(`${header}.${payload}`);
  const signature = hmac.digest('base64url');
  const crossToken = `${header}.${payload}.${signature}`;

  // Exchange for a merchant platform token
  const response = await fetch(`${MERCHANT_PLATFORM_URL}/api/auth/cross-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ crossToken, email, name }),
  });

  if (!response.ok) {
    throw new Error('Cross-auth failed');
  }

  const data = await response.json();
  return { token: data.token, userId: data.user.id };
}
