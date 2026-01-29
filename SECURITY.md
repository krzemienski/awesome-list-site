# Security Policy

## Supported Versions

We maintain security updates for the following versions:

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| 1.x     | :white_check_mark: | Current stable version |
| < 1.0   | :x:                | Pre-release versions |

We recommend always using the latest stable version.

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly. **Do not** open a public GitHub issue.

### Reporting Process

1. **Avoid public disclosure**: Do not post the vulnerability details on GitHub Issues, Discussions, or social media
2. **Use GitHub Security Advisory**: Click "Security" tab → "Advisories" → "Report a vulnerability"
3. **Alternatively, email**: If GitHub advisory is unavailable, reach out to the maintainers privately

### What to Include

Please provide:
- Description of the vulnerability
- Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
- Location in the code (file path, line numbers if possible)
- Steps to reproduce
- Potential impact
- Suggested fix (optional)
- Your name/contact for credit (optional)

## Response Timeline

Our team aims to:
- **Acknowledge receipt**: Within 48 hours
- **Initial assessment**: Within 7 days
- **Provide update**: Every 14 days thereafter
- **Release patch**: ASAP, typically within 30-90 days depending on severity

| Severity | Timeline |
| -------- | -------- |
| Critical (RCE, auth bypass, data exposure) | 30 days |
| High (privilege escalation, significant data leak) | 60 days |
| Medium (limited impact) | 90 days |
| Low (theoretical vulnerability, minimal impact) | 120 days |

## Scope

### In Scope

We take the following vulnerability types seriously:

- **Authentication/Authorization**: Login bypass, privilege escalation, session hijacking
- **Injection Attacks**: SQL injection, command injection, template injection
- **Cross-Site Scripting (XSS)**: Stored and reflected XSS, DOM XSS
- **Cross-Site Request Forgery (CSRF)**: Unprotected state-changing operations
- **Insecure Deserialization**: Unsafe object deserialization
- **Sensitive Data Exposure**: Leaking API keys, credentials, PII
- **Broken Access Control**: Accessing resources without proper authorization
- **Server-Side Vulnerabilities**: SSRF, XXE, path traversal, etc.
- **Dependency Vulnerabilities**: Known CVEs in dependencies

### Out of Scope

The following are **not** in scope and should not be reported as security issues:

- Rate limiting or DoS protections (unless causing actual service disruption)
- Social engineering or phishing attacks
- Physical security issues
- Vulnerabilities in third-party services we depend on (report to them directly)
- Proof-of-concept exploits without real impact
- Clickjacking or UI redressing without actual security impact
- Missing HTTP security headers without demonstrable impact
- TLS/SSL certificate issues outside our control

## Security Best Practices

### For Users

1. Keep the application updated to the latest version
2. Use strong, unique passwords for admin accounts
3. Enable authentication on the admin panel
4. Store API keys securely and rotate regularly
5. Use HTTPS in production
6. Review database access logs periodically

### For Contributors

1. Never commit secrets (API keys, credentials, PII)
2. Validate and sanitize all user input
3. Use parameterized queries for database access
4. Implement proper authentication and authorization checks
5. Follow the OWASP Top 10 guidelines
6. Use TypeScript strict mode for type safety
7. Run security audits: `npm audit`
8. Keep dependencies updated

## Dependencies

We use `npm audit` to track security vulnerabilities in dependencies:

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Audit production dependencies only
npm audit --production
```

All reported vulnerabilities are addressed within our response timeline above.

## Disclosure Policy

After a fix is released, we will:
1. Disclose the vulnerability in our CHANGELOG
2. Credit the reporter (with permission)
3. Provide guidance to users on updating
4. Analyze root causes to prevent similar issues

## Version Releases

Security patches are released as soon as fixes are available. When possible, we batch multiple fixes into a single release to minimize update fatigue.

## Contact

For critical security issues that need immediate attention, contact the maintainers through GitHub Security Advisory (preferred) or open a private security issue.

Thank you for helping keep this project secure!
