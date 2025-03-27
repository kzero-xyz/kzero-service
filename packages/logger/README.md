# @kzero/logger

A structured logging system for KZero services built on Winston.

## Features

- Multiple log levels support
- File rotation
- JSON and text format support
- Configurable metadata
- Custom transport support

## Configuration

The logger can be configured with the following options:

```typescript
interface LoggerConfig {
  module: string;
  level: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
  logPath?: string;
  maxSize: string;
  maxFiles: string;
  format: 'json' | 'text';
  console: boolean;
  customTransports: any[];
  metadata?: Record<string, any>;
}
```

## Dependencies

- winston
- winston-daily-rotate-file
- safe-stable-stringify
- zod

## License

GNU General Public License v3.0
