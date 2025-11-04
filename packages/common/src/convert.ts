// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

/**
 * ZK-Login Input Generator
 *
 * This module converts OAuth JWT tokens into zero-knowledge proof circuit inputs for zkLogin.
 * It implements the zkLogin protocol which allows users to authenticate with blockchain applications
 * using OAuth providers (like Google) while preserving privacy through zero-knowledge proofs.
 *
 * Key responsibilities:
 * - Parse and extract JWT fields (header, payload, signature)
 * - Convert JWT data into ZK circuit-compatible format
 * - Compute Poseidon hashes for various JWT components
 * - Generate address seed from user identity and salt
 * - Prepare all inputs required for Groth16 proof generation
 *
 * The main function `generateZKInput` produces inputs for the zkLogin circuit which proves:
 * 1. The user owns a valid JWT from an OAuth provider
 * 2. The JWT contains the claimed identity (sub, aud, iss)
 * 3. The ephemeral key is bound to the nonce in the JWT
 * 4. The address seed is correctly derived from identity + salt
 *
 * @see https://docs.sui.io/concepts/cryptography/zklogin
 */

import type { HexString } from '@polkadot/util/types';
import type { JWTPayload } from 'jose';
import type { CircuitSignals, Groth16Proof } from 'snarkjs';

import { Ed25519PublicKey } from '@mysten/sui.js/keypairs/ed25519';
import { hexToU8a } from '@polkadot/util';
import { decodeJwt } from 'jose';

import { poseidonHash } from './poseidon.js';

export type { JWTPayload } from 'jose';

interface JWTHeader {
  alg: string;
  kid: string;
  typ: string;
}

export interface JWTPublicKeyData {
  kty: string;
  alg: string;
  kid: string;
  use: string;
  e: string;
  n: string;
}

export { Groth16Proof };
export type PublicSignals = string[];

export type ZKLoginInput = CircuitSignals;

export interface SuiProofFields {
  iss_base64_details: {
    value: string;
    index_mod_4: number;
  };
  address_seed: string;
  header: string;
}

export interface ZKProofRequest {
  jwt: string;
  randomness: string;
  key: string;
  epoch: string;
  salt: string;
}

/**
 * Generates zero-knowledge proof inputs from OAuth JWT for zkLogin circuit
 *
 * This is the main entry point that converts an OAuth JWT token into circuit inputs
 * required by the zkLogin Groth16 proof system. The function performs complex transformations
 * including JWT parsing, RSA signature extraction, field hashing, and address seed computation.
 *
 * @param jwt - The complete OAuth JWT token (header.payload.signature in base64url format)
 * @param salt - Base64-encoded salt value used for address seed generation (privacy enhancing)
 * @param keyStr - Hex-encoded ephemeral Ed25519 public key that was bound to the nonce
 * @param epoch - Maximum epoch timestamp for key expiration
 * @param randomness - Random value used in nonce generation
 * @param certs - Array of OAuth provider's public keys (RSA) for signature verification
 *
 * @returns Object containing:
 *   - inputs: Complete ZKLoginInput object with 50+ circuit input fields
 *   - fields: SuiProofFields containing address_seed, header hash, and issuer details
 *
 * @example
 * ```typescript
 * const { inputs, fields } = await generateZKInput({
 *   jwt: "eyJhbGci...",
 *   salt: "abc123...",
 *   keyStr: "0xfafd...",
 *   epoch: "1234567890",
 *   randomness: "292291085...",
 *   certs: googlePublicKeys
 * });
 * ```
 *
 * @throws Error if RSA modulus cannot be found in certs
 */
export const generateZKInput = async ({
  jwt,
  salt,
  epoch,
  keyStr,
  randomness,
  certs,
}: {
  jwt: string;
  salt: string;
  keyStr: HexString;
  epoch: string;
  randomness: string;
  certs: JWTPublicKeyData[];
}): Promise<{
  inputs: ZKLoginInput;
  fields: SuiProofFields;
}> => {
  // Step 1: Parse JWT into components (header, payload, signature)
  const { header, payload } = parseJWT({ jwt });
  const headerBase64 = jwt.split('.')[0];
  const payloadBase64 = jwt.split('.')[1];
  const signatureBase64 = jwt.split('.')[2];
  const payloadStr = decodeBase64(payloadBase64);

  // Step 2: Extract RSA modulus and signature from JWT
  const modulus = await getModulus({ header, certs });
  const modulusBN = getBigNumber(decodeBase64Url(modulus));
  const signatureBN = getBigNumber(decodeBase64Url(signatureBase64));

  // Step 3: Convert to ZK circuit format (64-bit limbs for RSA verification)
  const modulusZK: string[] = getLimbs({
    base: 64,
    num: BigInt(modulusBN.toString()),
  });
  const signatureZK = getLimbs({
    base: 64,
    num: BigInt(signatureBN.toString()),
  });

  // Padding lengths for JWT field extraction
  // These are fixed by the zkLogin circuit constraints
  const subPadLength = 126; // Max length for 'sub' field extraction (user identifier)
  const noncePadLength = 44; // Max length for 'nonce' field (base64url encoded, ~32 bytes)
  const extEvLength = 53; // Extended 'nonce' field length for circuit
  const extAudLength = 160; // Max length for 'aud' field (client ID)

  // Poseidon hash input padding lengths
  // These define how many field elements we hash for each JWT component
  const issPaddingLength = 224; // Issuer URL hash padding (e.g., "https://accounts.google.com")
  const kcNameLength = 32; // Key claim name hash padding (e.g., "sub")
  const kcValueLength = 115; // Key claim value hash padding (user's sub value)
  const audValueLength = 145; // Audience value hash padding (OAuth client ID)
  const maxHeaderLen = 248; // Maximum JWT header length for hashing
  const paddedUnsignedJWTLength = 1600; // SHA-256 block padding for header.payload

  // Step 4: Prepare unsigned JWT with SHA-256 padding for circuit verification
  const { numSha2Blocks, paddedUnsignedJwt, payloadLen, payloadStartIndex } = getUnsignedPaddedJWT({
    jwt,
    length: paddedUnsignedJWTLength,
    paddingValue: 0,
  });

  // Step 5: Extract 'sub' field (user identifier) from JWT payload
  // This includes the field position in base64 and ASCII representations
  const {
    asciiArrayLength: ext_kc_length,
    asciiVal: ext_kc,
    b64Index: kc_index_b64,
    b64Size: kc_length_b64,
    colonIndex: kc_colon_index,
    nameLength: kc_name_length,
    valueIndex: kc_value_index,
    valueLength: kc_value_length,
  } = getExtKCFields({
    jwt,
    len: subPadLength,
    name: 'sub',
    payload: payloadStr,
    excludeEndComma: false,
  });
  // Step 6: Extract 'nonce' field from JWT payload
  // The nonce binds the ephemeral key to the JWT
  const {
    asciiArrayLength: ext_nonce_length,
    asciiVal: ext_nonce,
    b64Index: nonce_index_b64,
    b64Size: nonce_length_b64,
    colonIndex: nonce_colon_index,
    valueIndex: nonce_value_index,
  } = getExtKCFields({
    jwt,
    len: noncePadLength,
    name: 'nonce',
    payload: payloadStr,
    excludeEndComma: false,
  });

  // Step 7: Extract 'nonce' field again with extended length for circuit verification
  // This provides additional context for the nonce field validation
  const {
    asciiArrayLength: ext_ev_length,
    asciiVal: ext_ev,
    b64Index: ev_index_b64,
    b64Size: ev_length_b64,
    colonIndex: ev_colon_index,
    nameLength: ev_name_length,
    valueIndex: ev_value_index,
    valueLength: ev_value_length,
  } = getExtKCFields({
    jwt,
    len: extEvLength,
    name: 'nonce',
    payload: payloadStr,
    excludeEndComma: false,
  });

  // Step 8: Extract 'aud' field (OAuth client ID)
  const {
    asciiArrayLength: ext_aud_length,
    asciiVal: ext_aud,
    b64Index: aud_index_b64,
    b64Size: aud_length_b64,
    colonIndex: aud_colon_index,
    valueIndex: aud_value_index,
    valueLength: aud_value_length,
  } = getExtKCFields({
    jwt,
    len: extAudLength,
    name: 'aud',
    payload: payloadStr,
    excludeEndComma: false,
  });

  // Step 9: Extract 'iss' field (OAuth provider URL, e.g., https://accounts.google.com)
  const { b64Index: iss_index_b64_t, b64Size: iss_length_b64_t } = getExtKCFields({
    jwt,
    len: extAudLength,
    name: 'iss',
    payload: payloadStr,
    excludeEndComma: false,
  });
  const iss_index_b64 = iss_index_b64_t;
  const iss_length_b64 = iss_length_b64_t;
  // Step 10: Convert ephemeral public key to circuit format
  // Split the 256-bit key into two 128-bit parts for field arithmetic
  const key = new Ed25519PublicKey(hexToU8a(keyStr));
  const publicKeyBytes = toBigIntBE(key.toSuiBytes());
  const eph_public_key_0 = publicKeyBytes / 2n ** 128n; // Upper 128 bits
  const eph_public_key_1 = publicKeyBytes % 2n ** 128n; // Lower 128 bits

  // Step 11: Compute Poseidon hashes for JWT fields
  // These hashes are used to prove knowledge of specific JWT claims without revealing the full content

  // Hash the issuer field (OAuth provider URL)
  const issBase64 = jwt.substring(iss_index_b64, iss_index_b64 + iss_length_b64);
  const issFieldF = getPoseidonHash({
    fields: hashStringToField({
      paddingLength: issPaddingLength,
      inBase: 8,
      outBase: 248,
      value: issBase64,
    }),
  });

  // Hash the key claim name (always "sub" for user identifier)
  const kcNameF = getPoseidonHash({
    fields: hashStringToField({
      paddingLength: kcNameLength,
      inBase: 8,
      outBase: 248,
      value: 'sub',
    }),
  });
  // Hash the key claim value (user's unique identifier from OAuth provider)
  const kcValueF = getPoseidonHash({
    fields: hashStringToField({
      paddingLength: kcValueLength,
      inBase: 8,
      outBase: 248,
      value: payload.sub!,
    }),
  });

  // Hash the audience value (OAuth client ID)
  const audValueF = getPoseidonHash({
    fields: hashStringToField({
      paddingLength: audValueLength,
      inBase: 8,
      outBase: 248,
      value: payload.aud! as string,
    }),
  });

  // Hash the JWT header (contains alg, kid, typ)
  const headerF = getPoseidonHash({
    fields: hashStringToField({
      paddingLength: maxHeaderLen,
      inBase: 8,
      outBase: 248,
      value: headerBase64,
    }),
  });

  // Hash the RSA modulus for public key verification
  const modulusF = getPoseidonHash({
    fields: hashArrayToField({
      inBase: 64,
      outBase: 248,
      valueBE: modulusZK.reverse(),
    }),
  });

  // Step 12: Compute address seed (user's blockchain address determinant)
  // addressSeed = hash(kcNameF, kcValueF, audValueF, hash(salt))
  // This binds the user's identity (sub + aud) with the privacy-preserving salt
  const saltBN = getBigNumber(getPaddedBase64Ascii({ base64: salt, length: salt.length, paddingValue: 0 }));
  const addressSeed = getAddressSeed({
    audValueF: audValueF.toString(),
    kcNameF: kcNameF.toString(),
    kcValueF: kcValueF.toString(),
    salt: saltBN.toString(),
  });

  // Step 13: Calculate issuer index modulo 4 for base64 alignment verification
  // This ensures the issuer field is correctly positioned in the JWT
  const issMod4 = (iss_index_b64 - (headerBase64.length + 1)) % 4;

  // Step 14: Compute all_inputs_hash - a single commitment to all public inputs
  // This hash is verified on-chain to ensure proof validity
  const allInputsHash = getAllInputsHash({
    addressSeed: addressSeed.toString(),
    headerF: headerF.toString(),
    issFieldF: issFieldF.toString(),
    issIndexMod4: '' + issMod4,
    keyStr: keyStr,
    maxEpoch: epoch,
    modulusF: modulusF.toString(),
  });
  // Step 15: Assemble complete circuit inputs
  // These 50+ fields are all required by the zkLogin circuit for proof generation
  const inputs = {
    // Public commitment hash
    all_inputs_hash: allInputsHash.toString(),

    // Audience field extraction indices
    aud_colon_index: aud_colon_index.toString(),
    aud_index_b64: aud_index_b64.toString(),
    aud_length_b64: aud_length_b64.toString(),
    aud_value_index: aud_value_index.toString(),
    aud_value_length: aud_value_length.toString(),
    eph_public_key: [eph_public_key_0.toString(), eph_public_key_1.toString()],
    ev_colon_index: ev_colon_index.toString(),
    ev_index_b64: ev_index_b64.toString(),
    ev_length_b64: ev_length_b64.toString(),
    ev_name_length: ev_name_length.toString(),
    ev_value_index: ev_value_index.toString(),
    ev_value_length: ev_value_length.toString(),
    ext_aud: ext_aud.map((m) => m.toString()),
    ext_aud_length: ext_aud_length.toString(),
    ext_ev: ext_ev.map((m) => m.toString()),
    ext_ev_length: ext_ev_length.toString(),
    ext_kc: ext_kc.map((m) => m.toString()),
    ext_kc_length: ext_kc_length.toString(),
    ext_nonce: ext_nonce.map((m) => m.toString()),
    ext_nonce_length: ext_nonce_length.toString(),
    iss_index_b64: iss_index_b64.toString(),
    iss_length_b64: iss_length_b64.toString(),
    jwt_randomness: randomness,
    kc_colon_index: kc_colon_index.toString(),
    kc_index_b64: kc_index_b64.toString(),
    kc_length_b64: kc_length_b64.toString(),
    kc_name_length: kc_name_length.toString(),
    kc_value_index: kc_value_index.toString(),
    kc_value_length: kc_value_length.toString(),
    max_epoch: epoch,
    modulus: modulusZK.reverse(),
    nonce_colon_index: nonce_colon_index.toString(),
    nonce_index_b64: nonce_index_b64.toString(),
    nonce_length_b64: nonce_length_b64.toString(),
    nonce_value_index: nonce_value_index.toString(),
    num_sha2_blocks: numSha2Blocks.toString(),
    padded_unsigned_jwt: paddedUnsignedJwt.map((m) => m.toString()),
    payload_len: payloadLen.toString(),
    payload_start_index: payloadStartIndex.toString(),
    salt: saltBN.toString(),
    signature: signatureZK,
  } as ZKLoginInput;

  return {
    inputs,
    fields: {
      address_seed: addressSeed.toString(),
      header: headerF.toString(),
      iss_base64_details: {
        index_mod_4: issMod4,
        value: issFieldF.toString(),
      },
    },
  };
};

/**
 * Computes the address seed for a zkLogin user
 *
 * The address seed is a deterministic value derived from user identity and salt.
 * It's used to generate the user's blockchain address while preserving privacy.
 *
 * Formula: addressSeed = poseidonHash([kcNameF, kcValueF, audValueF, poseidonHash([salt])])
 *
 * @param kcNameF - Poseidon hash of the key claim name (e.g., "sub")
 * @param kcValueF - Poseidon hash of the key claim value (user's OAuth sub)
 * @param audValueF - Poseidon hash of the audience (OAuth client ID)
 * @param salt - Salt value (BigInt string) for privacy enhancement
 *
 * @returns The address seed as a BigInt
 *
 * @remarks
 * The salt ensures that even if the same user authenticates with the same OAuth provider
 * and client, different salts will produce different blockchain addresses, enhancing privacy.
 */
const getAddressSeed = ({
  audValueF,
  salt,
  kcNameF,
  kcValueF,
}: {
  kcNameF: string;
  kcValueF: string;
  audValueF: string;
  salt: string;
}) => {
  const hashedSalt = getPoseidonHash({ fields: [salt] }).toString();

  return getPoseidonHash({
    fields: [kcNameF, kcValueF, audValueF, hashedSalt],
  });
};

/**
 * Computes the all_inputs_hash commitment
 *
 * This hash is a Poseidon commitment to all public inputs of the zkLogin proof.
 * It's verified on-chain to ensure that the proof was generated with the correct parameters.
 *
 * Formula: poseidonHash([ephKey0, ephKey1, addressSeed, maxEpoch, issFieldF, issIndexMod4, headerF, modulusF])
 *
 * @param keyStr - Hex-encoded ephemeral Ed25519 public key
 * @param addressSeed - The computed address seed
 * @param maxEpoch - Maximum epoch for key expiration
 * @param issFieldF - Poseidon hash of the issuer field
 * @param issIndexMod4 - Issuer index modulo 4 for base64 alignment
 * @param headerF - Poseidon hash of JWT header
 * @param modulusF - Poseidon hash of RSA modulus
 *
 * @returns The all_inputs_hash as a BigInt
 *
 * @remarks
 * This hash binds together all the critical parameters: the ephemeral key, the user's
 * derived address, the OAuth provider details, and the RSA public key. The on-chain
 * smart contract can verify the proof by checking this single hash value.
 */
const getAllInputsHash = ({
  addressSeed,
  headerF,
  issFieldF,
  issIndexMod4,
  keyStr,
  maxEpoch,
  modulusF,
}: {
  keyStr: HexString;
  addressSeed: string;
  maxEpoch: string;
  issFieldF: string;
  issIndexMod4: string;
  headerF: string;
  modulusF: string;
}) => {
  // Convert ephemeral key to BigInt and split into 128-bit parts
  const key = new Ed25519PublicKey(hexToU8a(keyStr));
  const publicKeyBytes = toBigIntBE(key.toSuiBytes());
  const bytes: bigint[] = [];
  let tempKey = publicKeyBytes;

  // Convert to byte array (for debugging purposes, not used in hash)
  while (tempKey > 0) {
    bytes.push(tempKey % 2n ** 8n);
    tempKey = tempKey / 2n ** 8n;
  }

  bytes.reverse();

  const eph_public_key_0 = publicKeyBytes / 2n ** 128n;
  const eph_public_key_1 = publicKeyBytes % 2n ** 128n;

  return getPoseidonHash({
    fields: [
      eph_public_key_0.toString(),
      eph_public_key_1.toString(),
      addressSeed,
      maxEpoch,
      issFieldF,
      issIndexMod4,
      headerF,
      modulusF,
    ],
  });
};

const getPoseidonHash = ({ fields }: { fields: string[] }) => {
  return poseidonHash(fields);
};

const hashStringToField = ({
  paddingLength,
  value,
  inBase,
  outBase,
}: {
  value: string;
  paddingLength: number;
  inBase: number;
  outBase: number;
}) => {
  const asciiBe = getPaddedBase64Ascii({
    base64: value,
    length: paddingLength,
    paddingValue: 0,
  });

  asciiBe.reverse();

  return convertBase({
    inArrayLE: [...asciiBe].map((m) => BigInt(m)),
    inBase,
    outBase,
  });
};

const hashArrayToField = ({ valueBE, inBase, outBase }: { valueBE: string[]; inBase: number; outBase: number }) => {
  return convertBase({
    inArrayLE: [...valueBE.map((m) => BigInt(m)).reverse()],
    inBase,
    outBase,
  });
};

const convertBase = ({ inArrayLE, inBase, outBase }: { inBase: number; outBase: number; inArrayLE: bigint[] }) => {
  //Convert to binary
  const binaryValue = convertArrayToBinary({
    valuesLE: inArrayLE.map((m) => m.toString()),
    inBase,
  });
  const convertedValueLE: string[] = [];
  const chunkSize = outBase;
  // console.log("extraItemsCount",extraItemsCount);
  // Array(extraItemsCount).map(_m=>inArrayLE.push(0n));
  const chunks: string[][] = [];
  const binaryValueLE = binaryValue.split('').reverse();

  for (let i = 0; i < binaryValueLE.length; i += chunkSize) {
    chunks.push(binaryValueLE.slice(i, i + chunkSize));
  }

  for (const c of chunks) {
    convertedValueLE.push(convertAsciiToBigIntLE({ values: c, base: 1 }).toString());
  }

  return convertedValueLE.reverse();
};

const convertArrayToBinary = ({ valuesLE, inBase }: { valuesLE: string[] | number[]; inBase: number }) => {
  const vals: string[] = [];

  for (const v of valuesLE.reverse()) {
    vals.push(BigInt(v).toString(2).padStart(inBase, '0'));
  }

  return vals.join('');
};

const convertAsciiToBigIntLE = ({ values, base }: { values: string[]; base: number }): bigint => {
  const valueBN: bigint[] = values.map((m) => BigInt(m));
  const total = valueBN.reduce((prevValue: bigint, currentValue: bigint, currentIndex: number) => {
    return prevValue + currentValue * BigInt(2) ** (BigInt(base) * BigInt(currentIndex));
  });

  return total;
};

const parseJWT = ({ jwt }: { jwt: string }): { header: JWTHeader; payload: JWTPayload; signature: Uint8Array } => {
  const data = jwt.split('.');
  const decodedJWT = decodeJwt(jwt);
  const header = JSON.parse(decodeBase64(data[0])) as JWTHeader;
  const signature = decodeAscii(decodeBase64(data[2]));

  return { header, payload: decodedJWT, signature };
};

const getModulus = async ({ header, certs }: { header: JWTHeader; certs: JWTPublicKeyData[] }): Promise<string> => {
  const pubData = certs;
  const key = pubData.filter((m) => m.kid === header.kid);

  if (key.length > 0) {
    return key[0].n;
  }

  throw new Error('Modulus not found');
};

const getBigNumber = (data: Uint8Array): bigint => {
  const binary_data: string[] = [];

  data.map((m) => binary_data.push(BigInt(m).toString(2).padStart(8, '0')));

  return BigInt('0b' + binary_data.join(''));
};

const getLimbs = ({ base, num }: { num: bigint; base: number }): string[] => {
  const binary = num.toString(2);
  const padLength = Math.ceil(binary.length / base) * base;
  const rem2: string[] = [];

  //Big Endian
  chunkString(binary.padStart(padLength, '0'), base)!.map((part) => rem2.push(BigInt('0b' + part).toString()));
  //Little Endian
  rem2.reverse();

  return rem2;
};

const getPaddedBase64Ascii = ({
  base64,
  length,
  paddingValue,
}: {
  base64: string;
  length: number;
  paddingValue: number;
}): Uint8Array => {
  return new Uint8Array([
    ...Array.from(Array(base64.length).keys()).map((m) => base64.charCodeAt(m)),
    ...Array(length - base64.length).fill(paddingValue),
  ]);
};

const getUnsignedPaddedJWT = ({
  jwt,
  length,
  paddingValue,
}: {
  jwt: string;
  length: number;
  paddingValue: number;
}): {
  paddedUnsignedJwt: number[];
  payloadLen: number;
  numSha2Blocks: number;
  payloadStartIndex: number;
} => {
  const jwtArray = jwt.split('.');
  const s = jwtArray[0] + '.' + jwtArray[1];

  //get binary
  let jwtBinary = getBigNumber(getPaddedBase64Ascii({ base64: s, length: s.length, paddingValue: 0 }))
    .toString(2)
    .padStart(s.length * 8, '0');
  const len = jwtBinary.length;

  //Add 1
  jwtBinary = jwtBinary + '1';
  //Fill rest of array with 0's except last byte
  Array(512 - 64 - (jwtBinary.length % 512))
    .fill(0)
    .map(() => (jwtBinary += '0'));
  //Fill last byte with len
  jwtBinary += BigInt(len).toString(2).padStart(64, '0');
  const numSha2Blocks = jwtBinary.length / 512;
  const unsignedPaddedJWT: number[] = [];

  chunkString(jwtBinary, 8)!.map((m) => unsignedPaddedJWT.push(parseInt(BigInt('0b' + m).toString(10))));
  Array(length - unsignedPaddedJWT.length)
    .fill(0)
    .map(() => unsignedPaddedJWT.push(paddingValue));

  return {
    paddedUnsignedJwt: unsignedPaddedJWT,
    numSha2Blocks,
    payloadLen: jwtArray[1].length,
    payloadStartIndex: jwtArray[0].length + 1,
  };
};

const getBase64String = ({
  hayStack,
  jwt,
  needle,
}: {
  hayStack: string;
  needle: string;
  jwt: string;
}): {
  needleB64: string;
  startB64: number;
  endB64: number;
} => {
  const jwtValues = jwt.split('.');
  const header = jwtValues[0];
  const payload = jwtValues[1];
  const strIndex = hayStack.indexOf(needle);
  const strIndexB64 = Math.floor(strIndex / 3) * 4 + (strIndex % 3);
  const endIndex = strIndex + needle.length;
  const endIndexB64 = Math.floor(endIndex / 3) * 4 + (endIndex % 3 == 0 ? 0 : 1 + (endIndex % 3));
  // console.log("strIndex",strIndex,needle.length,"strIndexB64",strIndexB64,"endIndexB64",endIndexB64);
  const needleB64 = payload.substring(strIndexB64, endIndexB64);

  return {
    needleB64,
    startB64: strIndexB64 + header.length + '.'.length,
    endB64: endIndexB64 + header.length + '.'.length,
  };
};

const getExtKCFields = ({
  name,
  payload,
  len,
  jwt,
}: {
  payload: string;
  name: string;
  len: number;
  jwt: string;
  excludeEndComma: boolean;
}): {
  asciiVal: number[];
  b64Index: number;
  b64Size: number;
  asciiArrayLength: number;
  nameLength: number;
  colonIndex: number;
  valueIndex: number;
  valueLength: number;
  value: string;
} => {
  // let s=extract_str_from_payload(&payload,name).unwrap();
  const s = getKCString({ name, payload });
  // let mut base64=encode_str_to_base64(s,s.len().try_into().unwrap());
  // let base64Str=btoa(s);
  // let b64_index=jwt.find(&base64.get(0..base64.len()-4).unwrap().to_string().to_owned()).unwrap()+1_usize;
  // const b64Index=jwt.indexOf(base64Str.substring(0,base64Str.length-4))+1;
  const finalVal = s.substring(1, s.length);
  // const b64Size=btoa(finalVal).length;
  const { endB64, startB64 } = getBase64String({
    hayStack: payload,
    jwt,
    needle: finalVal,
  });
  // console.log("startB64=",startB64,"b64Index=",b64Index,"length=",(endB64-startB64),"b64Size=",b64Size,",finalVal=",finalVal);
  // console.log("b64Index=",b64Index,",b64Size=",b64Size,"finalVal.len",finalVal.length);
  // let final_val=s.get(1..s.len()).unwrap();
  // let b64_size=encode_str_to_base64(final_val,final_val.len().try_into().unwrap()).len();
  // let mut ascii_val=convert_str_to_ascii(&final_val);
  const asciiArray = getPaddedBase64Ascii({
    base64: finalVal,
    length: finalVal.length,
    paddingValue: 0,
  });
  // let ascii_val_len=ascii_val.len();
  const asciiArrayLength = asciiArray.length;
  // let name_len=name.len()+2_usize;
  const nameLength = name.length + 2;
  // let colon_index=final_val.find(":").unwrap();
  const colonIndex = finalVal.indexOf(':');
  // let value_index=colon_index+1;
  const valueIndex = colonIndex + 1;
  // let value_len=final_val.get(value_index+1..final_val.len()).unwrap().find("\"").unwrap()+2;
  const valueLength = finalVal.substring(valueIndex + 1, finalVal.length).indexOf('"') + 2;
  // console.log("value ",finalVal.substring(valueIndex+1,finalVal.length),valueLength);
  // // println!("hex val={:?}",convert_to_hex(&ascii_val));
  const updatedAsciiArray = padArray({ arr: asciiArray, len, paddingValue: 0 });

  // pad_num(&mut ascii_val,padding_length,0);
  // // println!("base64={:?}",final_val);
  // (s,ascii_val.iter().map(|m| m.to_string()).collect::<Vec<String>>(),ascii_val_len,b64_index,b64_size,name_len,colon_index,value_index,value_len)
  return {
    asciiArrayLength,
    b64Index: startB64,
    asciiVal: updatedAsciiArray,
    b64Size: endB64 - startB64,
    colonIndex,
    nameLength,
    valueIndex,
    valueLength,
    value: finalVal,
  };
};

const getKCString = ({ name, payload }: { payload: string; name: string }) => {
  const namePos = payload.indexOf(name);
  const start = namePos - 2;
  const end = payload.substring(namePos + 1, payload.length).indexOf(',');

  return payload.substring(start, namePos + end + 2);
};

const padArray = ({ arr, len, paddingValue }: { arr: Uint8Array; len: number; paddingValue: number }) => {
  const updatedArray: number[] = [...arr];

  Array(len - arr.length)
    .fill(0)
    .map(() => updatedArray.push(paddingValue));

  return updatedArray;
};

const decodeBase64 = (str: string): string => Buffer.from(str, 'base64').toString('binary');

const decodeBase64Inner = (encoded: string): Uint8Array => {
  return new Uint8Array(
    atob(encoded)
      .split('')
      .map((c) => c.charCodeAt(0)),
  );
};

const decodeBase64Url = (input: string) => {
  try {
    return decodeBase64Inner(input.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''));
  } catch (error) {
    console.error(error);
    throw new TypeError('The input to be decoded is not correctly encoded.');
  }
};

const decodeAscii = (str: string): Uint8Array => Buffer.from(str, 'ascii');
const chunkString = (str: string, l: number): RegExpMatchArray | null => str.match(new RegExp('.{1,' + l + '}', 'g'));

export function toBigIntBE(bytes: Uint8Array) {
  const hex = toHEX(bytes);

  if (hex.length === 0) {
    return BigInt(0);
  }

  return BigInt(`0x${hex}`);
}

export function toHEX(bytes: Uint8Array): string {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}
