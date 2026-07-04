# Security Policy

## Integrity Verification

Verify the package integrity after install:

```bash
npm install https://github.com/natsu-dev01/got-scraft.git

# Verify checksums
node -e "const got = require('got-scraft'); console.log('Version:', got.version); got.verify();"
```

## Reporting

Open an issue at https://github.com/natsu-dev01/got-scraft/issues
