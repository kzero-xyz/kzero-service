// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { expect, test } from 'vitest';

import { generateZKInput, toBigIntBE, toHEX } from '../src/convert';

// Test cases for toHEX function
test('toHEX converts Uint8Array to hex string', () => {
  const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);

  expect(toHEX(bytes)).toBe('12345678');
});

test('toHEX handles empty array', () => {
  const bytes = new Uint8Array([]);

  expect(toHEX(bytes)).toBe('');
});

test('toHEX handles single byte', () => {
  const bytes = new Uint8Array([0xff]);

  expect(toHEX(bytes)).toBe('ff');
});

test('toHEX handles multiple bytes with leading zeros', () => {
  const bytes = new Uint8Array([0x00, 0x01, 0x0a]);

  expect(toHEX(bytes)).toBe('00010a');
});

// Test cases for toBigIntBE function
test('toBigIntBE converts Uint8Array to bigint', () => {
  const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);

  expect(toBigIntBE(bytes)).toBe(BigInt('0x12345678'));
});

test('toBigIntBE handles empty array', () => {
  const bytes = new Uint8Array([]);

  expect(toBigIntBE(bytes)).toBe(BigInt(0));
});

test('toBigIntBE handles single byte', () => {
  const bytes = new Uint8Array([0xff]);

  expect(toBigIntBE(bytes)).toBe(BigInt('0xFF'));
});

test('toBigIntBE handles multiple bytes with leading zeros', () => {
  const bytes = new Uint8Array([0x00, 0x01, 0x0a]);

  expect(toBigIntBE(bytes)).toBe(BigInt('0x00010A'));
});

// Test cases for generateZKInput function
test('generateZKInput generates correct input for valid JWT', async () => {
  const jwt =
    'eyJhbGciOiJSUzI1NiIsImtpZCI6ImM3ZTA0NDY1NjQ5ZmZhNjA2NTU3NjUwYzdlNjVmMGE4N2FlMDBmZTgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI1NjA2MjkzNjU1MTctbXQ5ajlhcmZsY2dpMzVpOGhwb3B0cjY2cWdvMWxtZm0uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI1NjA2MjkzNjU1MTctbXQ5ajlhcmZsY2dpMzVpOGhwb3B0cjY2cWdvMWxtZm0uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTExNDA0NjE1MzAyNDYxNjQ1MjYiLCJub25jZSI6InRWRURLbE1rSmtLaC1zYjMweU01ZDdIeXNRZyIsIm5iZiI6MTc0MzU5NDEzNywiaWF0IjoxNzQzNTk0NDM3LCJleHAiOjE3NDM1OTgwMzcsImp0aSI6IjAxNmQxNDk1YjJmM2MxMWVkZjU4NmIzMWIxODEzZjMxMjQ1NDk4YjEifQ.Yu-bk__ZkWYhl--xDrn_9tUWBYXvxhOGyM4UT8TnsTzK1P7nJitMwdw1aUycjhq73QnW8Uo93CznidzzJkbdgDhpWJkJR5Okfjmv0Tttztr4FfpGj-fpcXtt-MlOAkscVC1QJn4q6QMVxK9wHxZtc4W1aBRQ0nKihLynh_LT7KeAZdond25qa4ExdvHZhgoQE2sb3C9g6XmFVNgudgrW9uglhGZ0ANa6SvFUN3vIKwCHpLlN-4hsNOdTkT4ZHQaN0X0woiNE8E52F2HKN4ZtdjIxBtPYJu7Q0WYv4xmTfMy91XyczlQC1UF4VY3DpHL8m9fyP0Re2TCNGAMx5J4EQA';
  const salt = '25299916604528864863320632865981';
  const epoch = '1';
  const keyStr = '0xfafd1d9e25a87e9652976a7bb06c2e4777c2e539d90f3ee7b6b12b9a45118a88';
  const randomness = '29229108527107981601948220068988';
  const certs = [
    {
      e: 'AQAB',
      kty: 'RSA',
      n: '7_H7AoQIGB-rZGIhz6ufR4ChFpkPBudrNoXbPHspjtMk1N8db1PbFa-v1yW0Pv8ujm_ewpQQLJz-KxJQz83-euIgMDKhKWc8Wd_lfjRrR0Yq6pr7JHcQDON4twaMno9mHfeFQLkKWId5hl4aQps9TEcm_jsK8MJJbWWKDjKgbMiu0U6-U-CdWbSoy42U3-trO359tTQfD8f8rkK4Ik2O3BtEgXoZ8mFDs84PR6IcYC2R5BN25bCcpK87Ch9KwEsU05c-ykPhH9AB6Ey5riR8gZ93kHxJPe8ZBmFfaWLU--t5IfwJh4g_6vDmFXZaiZm0TpYy7g9r9Vp8FW7OEQ7N1Q',
      alg: 'RS256',
      use: 'sig',
      kid: 'c7e04465649ffa606557650c7e65f0a87ae00fe8',
    },
  ];

  const result = await generateZKInput({
    jwt,
    salt,
    epoch,
    keyStr,
    randomness,
    certs,
  });

  expect(result).toHaveProperty('inputs');
  expect(result).toHaveProperty('fields');
  expect(result.inputs).toHaveProperty('all_inputs_hash');
  expect(result.fields).toHaveProperty('address_seed');
  expect(result.fields).toHaveProperty('header');
  expect(result.fields).toHaveProperty('iss_base64_details');
});

test('generateZKInput handles invalid JWT', async () => {
  const invalidJwt =
    'eyJhbGciOiJSUzI1NiIsImtpZCI6IjkxNGZiOWIwODcxODBiYzAzMDMyODQ1MDBjNWY1NDBjNmQ0ZjVlMmYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI1NjA2MjkzNjU1MTctbXQ5ajlhcmZsY2dpMzVpOGhwb3B0cjY2cWdvMWxtZm0uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI1NjA2MjkzNjU1MTctbXQ5ajlhcmZsY2dpMzVpOGhwb3B0cjY2cWdvMWxtZm0uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTExNDA0NjE1MzAyNDYxNjQ1MjYiLCJub25jZSI6IjRfclY0QWxkVS0wc3hjMTBNT0VGOGlneGlBMCIsIm5iZiI6MTc0MTc3NTY5NywiaWF0IjoxNzQxNzc1OTk3LCJleHAiOjE3NDE3Nzk1OTcsImp0aSI6IjBiYTFiZDI5MzE3OTUxNGRhODY2ZWVhODA4ZjE5NmZlNmZjOTE5NDUifQ.0Du2FeS4ecwHXJXyskYYMVuRCx6PfFxZCguKN05cvCL_yi50NPaH-FA-H9vkcNJEYV2OFnklnOqZditKn-6VI5jFdMbqNFsxh9RdkpBWpscN3r6u6ReZVqoIm38fwgqv3ssV3QIATwyrg2NiL9Xw05fnnN7XcGZh0JGyp9fKNnwxDUydTlM8__z-iDW80WhchyxnLthmu-eMhnETXDJ7v21oZZQZtZDEgyHbsyYQ5qTywHpsTWca2Ws2ZIHt1wIeaE4RAtFI_rIwn6jQMc6Nq3ZsWskXTD6VS_X7JkDr5o_7u7alMNvwuNLTffDuEpkHgty6op9_AJtDuIEMpwskEg';
  const salt = '25299916604528864863320632865981';
  const epoch = '1';
  const keyStr = '0xfafd1d9e25a87e9652976a7bb06c2e4777c2e539d90f3ee7b6b12b9a45118a88';
  const randomness = '29229108527107981601948220068988';
  const certs = [
    {
      e: 'AQAB',
      kty: 'RSA',
      n: '7_H7AoQIGB-rZGIhz6ufR4ChFpkPBudrNoXbPHspjtMk1N8db1PbFa-v1yW0Pv8ujm_ewpQQLJz-KxJQz83-euIgMDKhKWc8Wd_lfjRrR0Yq6pr7JHcQDON4twaMno9mHfeFQLkKWId5hl4aQps9TEcm_jsK8MJJbWWKDjKgbMiu0U6-U-CdWbSoy42U3-trO359tTQfD8f8rkK4Ik2O3BtEgXoZ8mFDs84PR6IcYC2R5BN25bCcpK87Ch9KwEsU05c-ykPhH9AB6Ey5riR8gZ93kHxJPe8ZBmFfaWLU--t5IfwJh4g_6vDmFXZaiZm0TpYy7g9r9Vp8FW7OEQ7N1Q',
      alg: 'RS256',
      use: 'sig',
      kid: 'c7e04465649ffa606557650c7e65f0a87ae00fe8',
    },
  ];

  await expect(
    generateZKInput({
      jwt: invalidJwt,
      salt,
      epoch,
      keyStr,
      randomness,
      certs,
    }),
  ).rejects.toThrow();
});
