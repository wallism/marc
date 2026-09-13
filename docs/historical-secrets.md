# Reviewing historical secrets

Secret scanners can detect passwords, API keys and tokens in earlier commits, even when today's files no longer contain them. GitHub's secret scanning checks Git history across all branches. This is why an existing repository may report old exposures during setup. See GitHub's [secret scanning overview](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning).

## Find and resolve the GitHub alert

Open the repository on GitHub, select **Security and quality**, then **Secret scanning** under **Vulnerability alerts**. Open an alert to inspect the affected credential and locations. Feature availability depends on the repository and GitHub plan.

1. Treat a real committed credential as compromised. Replace it where still needed, update services that use it, and revoke the old value with its issuing provider. Deleting it from a file does not invalidate it.
2. Verify with the provider that the exposed value is no longer valid, including when someone says it was already rotated. Record the verification and reason without copying the secret itself. An unknown status is not evidence of revocation.
3. Once resolved, use **Close as** on the GitHub alert, choose the appropriate reason and record the remediation. See GitHub's [resolving secret scanning alerts](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-secret-scanning-alerts/resolving-alerts) for the official procedure.

## Exclude a reviewed historical Gitleaks finding

MARC uses Gitleaks as a separate scan, which may keep detecting the revoked value in Git history. Closing a GitHub alert does not suppress Gitleaks, and a Gitleaks exclusion does not close a GitHub alert.

After verifying revocation, review the exact Gitleaks finding and add only its `full-commit-sha:relative-file:rule-id:line` fingerprint, with a reason, to the consumer's configured ignore file. A confirmed false positive can also be excluded with its own documented reason. Never exclude a live credential or use a broad file exclusion to silence historical findings.

New consumers start with no exclusions. Keep reviewed entries in the consumer repository, set `scans.secretExceptions` to their consumer-relative path, and follow [Gitleaks configuration and CI](configuration.md#gitleaks-exceptions-and-ci). MARC ships no consumer exceptions.
