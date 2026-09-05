# Security policy

## Data flow

Open Retirement Planner is a static application. It has no application server, user accounts, telemetry, analytics, advertising, or database. Plan data is processed in browser memory.

When enabled, the local vault stores one encrypted payload under `open-retirement-planner-vault-v1` in browser local storage. Encryption uses AES-256-GCM. The key is derived from the user-provided passphrase with PBKDF2-SHA-256, a random 128-bit salt, and 310,000 iterations. Every save uses a fresh random 96-bit IV and salt.

The passphrase and derived key are not written to storage. Closing or reloading the page locks the vault.

## Threat model

The vault is designed to reduce exposure from:

- casual access to a browser profile;
- unencrypted browser backups; and
- offline inspection of local browser storage.

It does not defend an unlocked browser session against:

- malware, keyloggers, or screen capture;
- malicious or compromised browser extensions;
- a compromised browser or operating system;
- weak or reused passphrases; or
- disclosure of a raw JSON export.

No browser-only design can guarantee safety when malware can act with the user's privileges.

## Reporting a vulnerability

Please open a GitHub security advisory for vulnerabilities. Do not include real financial data, passphrases, exported plans, or other personal information in a public issue.
