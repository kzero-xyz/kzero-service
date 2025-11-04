// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import './dotenv.js';

import { randomBytes } from 'node:crypto';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { generateZKInput, type JWTPublicKeyData } from '@kzero/common';

import { generateProof } from './generateProof.js';
import { startWorker } from './worker.js';

void yargs(hideBin(process.argv))
  .scriptName('proof-worker')
  .usage('$0 <cmd>')
  .wrap(null)
  .locale('en')
  .command('start', 'Start the proof worker', () => {
    startWorker();
  })
  .command(
    'gen-proof',
    'Generate a proof',
    (yargs) =>
      yargs
        .option('jwt', {
          alias: 'j',
          type: 'string',
          description: 'jwt to generate proof for',
        })
        .option('salt', {
          alias: 's',
          type: 'string',
          description: 'salt to generate proof for',
        })
        .option('epoch', {
          alias: 'e',
          type: 'string',
          description: 'epoch for proof',
        })
        .option('key', {
          alias: 'k',
          type: 'string',
          description: 'ephemeralPublicKey generate proof for',
        })
        .option('randomness', {
          alias: 'r',
          type: 'string',
          description: 'randomness for generate proof',
        })
        .option('cert-url', {
          alias: 'c',
          type: 'string',
          description: 'cert url for generate proof, e.g. https://www.googleapis.com/oauth2/v3/certs',
        })
        .demandOption(['jwt', 'key', 'epoch', 'randomness', 'cert-url']),
    async (argv) => {
      const jwt = argv.jwt;
      const key = argv.key;
      const epoch = argv.epoch;
      const randomness = argv.randomness;
      const salt = argv.salt || BigInt('0x' + randomBytes(32).toString('hex')).toString();
      const certUrl = argv['cert-url'];

      const certs: JWTPublicKeyData[] = await fetch(certUrl)
        .then((res) => res.json())
        .then((json) => (json as { keys: JWTPublicKeyData[] }).keys);

      generateZKInput({
        jwt,
        salt,
        epoch,
        keyStr: key as `0x${string}`,
        randomness,
        certs,
      })
        .then(({ inputs, fields }) => {
          return generateProof(inputs, fields);
        })
        .then(() => {
          process.exit();
        })
        .catch(() => {
          process.exit(1);
        });
    },
  )
  .demandCommand(1, 'You must provide a valid command.')
  .help()
  .version(false)
  .strict().argv;
