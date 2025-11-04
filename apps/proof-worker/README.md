# @kzero/proof-worker

Zero-knowledge proof generation worker for KZero services.

## Configuration

### Environment Variables

- `CACHE_DIR` - Directory for caching (default: '.cache')
- `ZKEY_PATH` - Path to zkey file (default: 'zkLogin-main.zkey')
- `WITNESS_BIN_PATH` - Path to witness binary
- `PROVER_BIN_PATH` - Path to prover binary
- `LOG_LEVEL` - Logging level (default: 'info')
- `LOG_PATH` - Path to log file (optional)

### Binary Tools Setup

1. Download the zkLogin binary tools (witness and prover)
2. Set the environment variables:
   ```bash
   export WITNESS_BIN_PATH=/path/to/zkLogin
   export PROVER_BIN_PATH=/path/to/prover
   export ZKEY_PATH=/path/to/zkeyfile
   ```

## Usage

The proof-worker provides two main commands:

### Generate Proof

Generate a zero-knowledge proof from JWT and related data:

```bash
npx @kzero/proof-worker gen-proof [options]
```

#### Options

- `-j, --jwt <string>` - JWT token to generate proof for (required)
- `-s, --salt <string>` - Salt value for proof generation (optional)
- `-e, --epoch <string>` - Epoch value for proof generation (required)
- `-k, --key <string>` - Ephemeral public key for proof generation (required)
- `-r, --randomness <string>` - Randomness value for proof generation (required)
- `-c, --cert-url <string>` - URL to fetch JWT certificates from (required)

#### Example

```bash
npx @kzero/proof-worker gen-proof \
  --jwt "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --epoch "1234567890" \
  --key "0x1234..." \
  --randomness "0xabcd..." \
  --cert-url "https://www.googleapis.com/oauth2/v3/certs"
```

## Troubleshooting

Common issues and solutions:

1. **Binary not found**
   - Ensure the binary paths are correctly set in environment variables
   - Check if the binaries have execute permissions

2. **Certificate fetch failed**
   - Verify the cert-url is accessible
   - Check network connectivity

3. **Cache directory issues**
   - Ensure the cache directory is writable
   - Check disk space availability

## License

GNU General Public License v3.0
