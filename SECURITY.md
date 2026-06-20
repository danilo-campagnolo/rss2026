# Security Policy

## Supported Versions

Security fixes target the main branch until the project publishes versioned releases.

## Reporting a Vulnerability

Please do not disclose security issues publicly before maintainers have had a chance to investigate.

If GitHub private vulnerability reporting is enabled for this repository, use that channel. Otherwise, open a minimal public issue that says you have a security report to share, without including exploit details.

Helpful report details include:

- Affected version or commit.
- Reproduction steps.
- Impact.
- Any suggested remediation.

## Security Notes

- Feed-provided HTML must be sanitized before rendering.
- Feed imports should only fetch HTTP and HTTPS URLs.
- Do not commit local `.env` files, databases, tokens, or credentials.
