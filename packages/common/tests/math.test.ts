// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { expect, test } from 'vitest';

function add(a: number, b: number) {
  return a + b;
}

test('adds 1 + 2 to equal 3', () => {
  expect(add(1, 2)).toBe(3);
});
