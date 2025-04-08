// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { expect, test } from 'vitest';

import { poseidonHash } from '../src/poseidon';

// Test cases for poseidonHash function
// The expect result is generate using the poseidon hash function from 'https://www.poseidon-hash.info/'
// You can also reach the the online poseidon hash function from 'https://poseidon-online.pages.dev/' or 'https://zk-hashes.vercel.app'
test('poseidonHash handles single input', () => {
  const input = [1];
  const result = poseidonHash(input);

  expect(typeof result).toBe('bigint');
  expect(result).toEqual(BigInt('18586133768512220936620570745912940619677854269274689475585506675881198879027'));
});

test('poseidonHash handles multiple inputs within direct hash range', () => {
  const inputs = [1, 2, 3, 4, 5];
  const result = poseidonHash(inputs);

  expect(typeof result).toBe('bigint');
  expect(result).toBeDefined();
  expect(result).toEqual(BigInt('6183221330272524995739186171720101788151706631170188140075976616310159254464'));
});

test('poseidonHash handles maximum direct hash inputs (16)', () => {
  const inputs = Array(16).fill(1);
  const result = poseidonHash(inputs);

  expect(typeof result).toBe('bigint');
  expect(result).toBeDefined();
  expect(result).toEqual(BigInt('16247148725799187968432601021479716680539182929063252906051522933915398361998'));
});

test('poseidonHash handles inputs requiring recursive hashing', () => {
  const inputs = Array(20).fill(1);
  const result = poseidonHash(inputs);

  expect(typeof result).toBe('bigint');
  expect(result).toBeDefined();
  expect(result).toEqual(BigInt('15072132727802611689075884217146098229636289111460632484678401923831907179353'));
});

test('poseidonHash handles different input types', () => {
  const inputs = ['1', 2, BigInt(3)];
  const result = poseidonHash(inputs);

  expect(typeof result).toBe('bigint');
  expect(result).toBeDefined();
  expect(result).toEqual(BigInt('6542985608222806190361240322586112750744169038454362455181422643027100751666'));
});

test('poseidonHash handles empty array', () => {
  expect(() => {
    poseidonHash([]);
  }).toThrow();
});

test('poseidonHash handles inputs exceeding maximum length', () => {
  const inputs = Array(33).fill(1);

  expect(() => {
    poseidonHash(inputs);
  }).toThrow('Yet to implement: Unable to hash a vector of length 33');
});

test('poseidonHash produces consistent results for same input', () => {
  const inputs = [1, 2, 3];
  const result1 = poseidonHash(inputs);
  const result2 = poseidonHash(inputs);

  expect(result1).toEqual(result2);
});

test('poseidonHash produces different results for different inputs', () => {
  const inputs1 = [1, 2, 3];
  const inputs2 = [1, 2, 4];
  const result1 = poseidonHash(inputs1);
  const result2 = poseidonHash(inputs2);

  expect(result1).not.toEqual(result2);
});
