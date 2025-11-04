#!/usr/bin/env node

// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import https from 'node:https';
import { dirname, join } from 'node:path';
import { exit } from 'node:process';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Asset configuration
const ASSETS = [
  {
    name: 'zkLogin.zkey',
    url: 'https://github.com/sui-foundation/zklogin-ceremony-contributions/raw/main/zkLogin-main.zkey',
    size: '588 MB',
    required: true,
  },
];

const ASSETS_DIR = join(__dirname, '..', 'assets');
const TIMEOUT = 300000; // 5 minutes timeout for large files

/**
 * Download a file using Node.js https module (cross-platform)
 */
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    const request = https.get(url, { timeout: TIMEOUT }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;

        console.log(`Following redirect to: ${redirectUrl}`);
        downloadFile(redirectUrl, destPath).then(resolve).catch(reject);

        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));

        return;
      }

      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      let lastProgress = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;

        if (totalBytes) {
          const progress = Math.floor((downloadedBytes / totalBytes) * 100);

          if (progress >= lastProgress + 10) {
            // Log every 10%
            console.log(`  Progress: ${progress}% (${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)})`);
            lastProgress = progress;
          }
        }
      });

      pipeline(response, file)
        .then(() => {
          console.log(`  ✓ Download complete: ${formatBytes(downloadedBytes)}`);
          resolve();
        })
        .catch(reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Main download function
 */
async function downloadAssets() {
  console.log('🔧 Checking zkLogin assets...\n');

  // Ensure assets directory exists
  if (!existsSync(ASSETS_DIR)) {
    console.log(`Creating assets directory: ${ASSETS_DIR}`);
    mkdirSync(ASSETS_DIR, { recursive: true });
  }

  let downloadCount = 0;
  let skipCount = 0;

  for (const asset of ASSETS) {
    const destPath = join(ASSETS_DIR, asset.name);

    if (existsSync(destPath)) {
      console.log(`✓ ${asset.name} already exists, skipping`);
      skipCount++;
      continue;
    }

    console.log(`📥 Downloading ${asset.name} (${asset.size})...`);
    console.log(`   URL: ${asset.url}`);

    try {
      await downloadFile(asset.url, destPath);
      downloadCount++;
      console.log(`✓ Successfully downloaded ${asset.name}\n`);
    } catch (error) {
      console.error(`✗ Failed to download ${asset.name}:`, error.message);

      if (asset.required) {
        console.error('\n❌ Required asset download failed. Please download manually:');
        console.error(`   curl -L ${asset.url} -o ${destPath}`);
        exit(1);
      }
    }
  }

  console.log('\n✅ Asset check complete!');
  console.log(`   Downloaded: ${downloadCount}`);
  console.log(`   Skipped: ${skipCount}`);
}

// Run download
downloadAssets().catch((error) => {
  console.error('❌ Asset download failed:', error);
  exit(1);
});
