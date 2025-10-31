// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

/**
 * OAuth provider constants
 */
export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
} as const;

/**
 * OAuth state cookie configuration
 */
export const OAUTH_STATE_COOKIE = {
  /**
   * Cookie name suffix for OAuth state
   * Actual name will be: `{provider}-oauth-state`
   */
  NAME_SUFFIX: 'oauth-state',

  /**
   * Cookie expiration time in milliseconds (10 minutes)
   */
  MAX_AGE: 10 * 60 * 1000,

  /**
   * Cookie path template
   * Actual path will be: `/auth/{provider}`
   */
  PATH_TEMPLATE: '/auth',
} as const;

/**
 * Get OAuth state cookie name for a provider
 *
 * @param provider - OAuth provider (e.g., 'google', 'github')
 * @returns Cookie name (e.g., 'google-oauth-state')
 */
export function getOAuthStateCookieName(provider: string): string {
  return `${provider}-${OAUTH_STATE_COOKIE.NAME_SUFFIX}`;
}

/**
 * Get OAuth cookie path for a provider
 *
 * @param provider - OAuth provider (e.g., 'google', 'github')
 * @returns Cookie path (e.g., '/auth/google')
 */
export function getOAuthCookiePath(provider: string): string {
  return `${OAUTH_STATE_COOKIE.PATH_TEMPLATE}/${provider}`;
}

/**
 * Get OAuth state cookie options
 *
 * @param isProduction - Whether running in production environment
 * @param provider - OAuth provider
 * @returns Cookie options object
 */
export function getOAuthStateCookieOptions(isProduction: boolean, provider: string) {
  return {
    httpOnly: true, // Prevent XSS attacks
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax' as const, // CSRF protection
    maxAge: OAUTH_STATE_COOKIE.MAX_AGE, // 10 minutes
    path: getOAuthCookiePath(provider), // Restrict to OAuth routes
  };
}
