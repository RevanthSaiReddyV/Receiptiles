import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/connectors/costco/extract-token
 *
 * Returns a small HTML page that the user opens AFTER logging into costco.com.
 * The page reads the auth token from costco.com's localStorage via a
 * bookmarklet-style approach, then posts it back to our connect API.
 *
 * Flow:
 * 1. User logs into costco.com on any device (phone or desktop)
 * 2. User taps our bookmarklet / opens this page in same browser
 * 3. This page uses window.opener or fetch to read the token
 * 4. Token sent to our API, account connected
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://receipts-platform.vercel.app";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connecting Costco...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #f8f9fb; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: white; border-radius: 16px; border: 1px solid #e4e4e7; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 32px; max-width: 400px; width: 100%; text-align: center; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 18px; font-weight: 700; color: #18181b; margin-bottom: 8px; }
    p { font-size: 13px; color: #71717a; line-height: 1.5; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e4e4e7; border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 16px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status { font-size: 12px; color: #a1a1aa; margin-top: 12px; }
    .error { color: #ef4444; font-size: 13px; margin-top: 12px; }
    .success { color: #10b981; }
    .btn { display: inline-block; background: #18181b; color: white; border: none; border-radius: 12px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; margin-top: 16px; }
    .btn:hover { background: #27272a; }
    .instructions { text-align: left; margin-top: 16px; font-size: 12px; color: #52525b; }
    .instructions ol { padding-left: 20px; }
    .instructions li { margin-bottom: 8px; }
    .code { background: #18181b; color: #34d399; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 11px; display: block; margin: 8px 0; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card" id="card">
    <div class="icon">🏪</div>
    <h1>Connect Costco</h1>
    <p>We need to grab your session token from costco.com</p>

    <div id="auto-section">
      <div class="spinner"></div>
      <p class="status" id="status">Checking for Costco session...</p>
    </div>

    <div id="manual-section" style="display:none">
      <div class="instructions">
        <p style="margin-bottom:8px;font-weight:600;color:#18181b;">Paste your Costco token:</p>
        <ol>
          <li>Open <a href="https://www.costco.com/myaccount" target="_blank">costco.com</a> and log in</li>
          <li>Open browser console (⌘+Option+J on Mac, Ctrl+Shift+J on Windows)</li>
          <li>Paste: <span class="code">copy(localStorage.getItem('idToken'))</span></li>
          <li>Paste the result below:</li>
        </ol>
        <textarea id="token-input" placeholder="Paste token here..." style="width:100%;height:60px;border:1px solid #e4e4e7;border-radius:8px;padding:8px;font-size:11px;font-family:monospace;resize:none;margin-top:8px;"></textarea>
        <button class="btn" onclick="submitToken()" style="width:100%;margin-top:12px;">Connect</button>
      </div>
    </div>

    <div id="success-section" style="display:none">
      <div class="icon">✅</div>
      <h1 class="success">Connected!</h1>
      <p id="result-text"></p>
      <a href="${appUrl}/receipts" class="btn">View Receipts</a>
    </div>

    <div id="error-section" style="display:none">
      <p class="error" id="error-text"></p>
    </div>
  </div>

  <script>
    const API_URL = '${appUrl}';

    async function tryAutoExtract() {
      // This only works if the page is opened from costco.com context
      // On most browsers, cross-origin localStorage access is blocked
      // So we fall back to manual entry
      document.getElementById('status').textContent = 'Auto-detection not available on this device';
      setTimeout(() => {
        document.getElementById('auto-section').style.display = 'none';
        document.getElementById('manual-section').style.display = 'block';
      }, 1500);
    }

    async function submitToken() {
      const token = document.getElementById('token-input').value.trim();
      if (!token) {
        showError('Please paste your token');
        return;
      }

      document.getElementById('manual-section').style.display = 'none';
      document.getElementById('auto-section').style.display = 'block';
      document.getElementById('status').textContent = 'Connecting to Costco...';

      try {
        const connectRes = await fetch(API_URL + '/api/connectors/costco/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ idToken: token }),
        });

        if (!connectRes.ok) {
          const data = await connectRes.json();
          showError(data.error || 'Connection failed');
          return;
        }

        document.getElementById('status').textContent = 'Syncing receipts...';

        const syncRes = await fetch(API_URL + '/api/connectors/costco/sync', {
          method: 'POST',
          credentials: 'include',
        });

        const syncData = await syncRes.json();

        document.getElementById('auto-section').style.display = 'none';
        document.getElementById('success-section').style.display = 'block';
        document.getElementById('result-text').textContent =
          'Imported ' + (syncData.imported || 0) + ' receipts from Costco';
      } catch (err) {
        showError('Network error: ' + err.message);
      }
    }

    function showError(msg) {
      document.getElementById('auto-section').style.display = 'none';
      document.getElementById('manual-section').style.display = 'block';
      document.getElementById('error-section').style.display = 'block';
      document.getElementById('error-text').textContent = msg;
    }

    // Check if we received a token via URL hash (from bookmarklet)
    const hashToken = window.location.hash.slice(1);
    if (hashToken && hashToken.length > 20) {
      document.getElementById('token-input').value = hashToken;
      submitToken();
    } else {
      tryAutoExtract();
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
