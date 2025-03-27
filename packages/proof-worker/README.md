# @kzero/proof-worker

Zero-knowledge proof generation worker for KZero services.

## Features

- ZK proof generation
- Cache proof by File system
- Configurable proof generation paths

## Configuration

Environment variables:
- `CACHE_DIR` - Directory for caching (default: '.cache')
- `ZKEY_PATH` - Path to zkey file (default: 'zkLogin-main.zkey')
- `WITNESS_BIN_PATH` - Path to witness binary
- `PROVER_BIN_PATH` - Path to prover binary

## License

GNU General Public License v3.0
