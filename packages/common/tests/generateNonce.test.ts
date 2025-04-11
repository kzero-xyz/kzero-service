// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { expect, test } from 'vitest';

import { generateNonce } from '../src/generateNonce';

// Test cases for generateNonce function
test('generateNonce generates valid nonce with default maxEpoch', () => {
  const ephemeralPublicKey = '0xfafd1d9e25a87e9652976a7bb06c2e4777c2e539d90f3ee7b6b12b9a45118a88';
  const result = generateNonce(ephemeralPublicKey);

  expect(result).toHaveProperty('nonce');
  expect(result).toHaveProperty('randomness');
  expect(result).toHaveProperty('maxEpoch');
  expect(typeof result.nonce).toBe('string');
  expect(typeof result.randomness).toBe('string');
  expect(typeof result.maxEpoch).toBe('number');
  expect(result.maxEpoch).toBeGreaterThan(Date.now());
  // Note: the Date.now() is not precise, so we need to check if the maxEpoch
  // is less than or equal to 24 hours from now.
  // The actual maxEpoch is computed in the generateNonce function
  expect(result.maxEpoch).toBeLessThanOrEqual(Date.now() + 3600 * 24 * 1000);
});

test('generateNonce generates valid nonce with custom maxEpoch', () => {
  const ephemeralPublicKey = '0xfafd1d9e25a87e9652976a7bb06c2e4777c2e539d90f3ee7b6b12b9a45118a88';
  const customMaxEpoch = Date.now() + 3600 * 1000; // 1 hour from now
  const result = generateNonce(ephemeralPublicKey, customMaxEpoch);

  expect(result).toHaveProperty('nonce');
  expect(result).toHaveProperty('randomness');
  expect(result).toHaveProperty('maxEpoch');
  expect(result.maxEpoch).toBe(customMaxEpoch);
});

test('generateNonce generates different nonces for same input', () => {
  const ephemeralPublicKey = '0xfafd1d9e25a87e9652976a7bb06c2e4777c2e539d90f3ee7b6b12b9a45118a88';
  const maxEpoch = Date.now() + 3600 * 24 * 1000;

  const result1 = generateNonce(ephemeralPublicKey, maxEpoch);
  const result2 = generateNonce(ephemeralPublicKey, maxEpoch);

  expect(result1.nonce).not.toBe(result2.nonce);
  expect(result1.randomness).not.toBe(result2.randomness);
});

test('generateNonce handles invalid public key format', () => {
  const invalidPublicKey = '0xinvalidkeyformat';

  expect(() => {
    generateNonce(invalidPublicKey);
  }).toThrow();
});

test('generateNonce handles short public key', () => {
  const shortPublicKey = '0xfafd1d9e25a87e9652976a7bb06c2e4777c2e539d90f3ee7b6b12b9a45118a';

  expect(() => {
    generateNonce(shortPublicKey);
  }).toThrow();
});
