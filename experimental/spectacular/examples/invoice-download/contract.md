<!-- spec-lint: active -->
# Invoice download, revision DOWNLOAD-2

Decision owner: example product owner.
Scope: the modelled callable's API and link paths. Formatting, link expiry,
HTTP integration, and production policy-service behaviour are excluded.
Governing source: [ACCESS-1](policy.md).

### REQ-DOWNLOAD-001 — Granted download response
Status: accepted
Statement: When an invoice download is requested through the API or link path with access granted at download time, the invoice download service shall return status 200 and the requested invoice data.
Basis: Example owner's settled download decision, consistent with ACCESS-1.
References: INV-ACCESS-001

### REQ-DOWNLOAD-002 — Denied download response
Status: accepted
Statement: If access at download time is denied for an invoice download through the API or link path, then the invoice download service shall return status 403 without invoice data.
Basis: Example owner's settled download decision, consistent with ACCESS-1.
References: INV-ACCESS-001

### REQ-DOWNLOAD-003 — Unavailable access response
Status: accepted
Statement: If access at download time cannot be established for an invoice download through the API or link path, then the invoice download service shall return status 503 without invoice data.
Basis: Example owner's settled download decision, consistent with ACCESS-1.
References: INV-ACCESS-001

### AC-DOWNLOAD-001 — Both paths and all access states
Covers: REQ-DOWNLOAD-001, REQ-DOWNLOAD-002, REQ-DOWNLOAD-003, INV-ACCESS-001
Expected: The concrete cases in expected.json are satisfied at the callable boundary; a prior link grant does not change their expected results.
Basis: Example owner's decisions, independent of good.py and bad.py.
Verification: Planned until an actual evidence.json record identifies the commands, file hashes, and results. No claim of HTTP or production conformance.
