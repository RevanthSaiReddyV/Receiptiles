import { NextRequest, NextResponse } from 'next/server';

const MERCHANT_PLATFORM_URL = process.env.MERCHANT_PLATFORM_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(`${MERCHANT_PLATFORM_URL}/api/claim/preview/${code}`);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Merchant platform unavailable' }, { status: 502 });
  }
}
