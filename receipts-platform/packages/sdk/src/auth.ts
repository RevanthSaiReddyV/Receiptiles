import type {
  AuthorizationUrlOptions,
  ExchangeCodeOptions,
  RefreshTokenOptions,
  TokenResponse,
} from "./types";

const DEFAULT_BASE_URL = "https://receiptiles.com";

/**
 * Generate an OAuth2 authorization URL to redirect users to.
 */
export function getAuthorizationUrl(options: AuthorizationUrlOptions): string {
  const { clientId, redirectUri, scopes, state } = options;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
  });

  if (state) {
    params.set("state", state);
  }

  return `${DEFAULT_BASE_URL}/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and refresh tokens.
 */
export async function exchangeCode(options: ExchangeCodeOptions): Promise<TokenResponse> {
  const { clientId, clientSecret, code, redirectUri } = options;

  const response = await fetch(`${DEFAULT_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `OAuth token exchange failed: ${response.status} ${body?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/**
 * Use a refresh token to obtain a new access token.
 */
export async function refreshToken(options: RefreshTokenOptions): Promise<TokenResponse> {
  const { clientId, clientSecret, refreshToken: token } = options;

  const response = await fetch(`${DEFAULT_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `OAuth token refresh failed: ${response.status} ${body?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}
