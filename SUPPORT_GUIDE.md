# Support Guide — SA Property Auctions

**Audience:** Support / ops covering public beta  
**Version:** RC6

## Channels

| Channel | Use |
|---|---|
| `info@sapropertyauctions.co.za` | General support |
| `privacy@sapropertyauctions.co.za` | POPIA / privacy |
| `/contact` form | Logged as `support.request` (type contact) |
| `/privacy-requests` form | Logged as `support.request` (type privacy) |
| Profile self-serve | Export / Delete account |

## Workflow

1. Triage email + structured app logs daily.  
2. Acknowledge within **1 business day** during beta.  
3. For privacy: verify identity (signed-in user or matching email proof).  
4. Prefer directing users to Profile export/delete when applicable.  
5. Billing issues: Stripe dashboard + Customer Portal; never ask for full card numbers.  
6. Product bugs: file internal issue; update `/known-issues` if user-facing.

## Manual processes (still required)

- Reading form submissions from logs/email (no ticket CRM yet).  
- Completing complex POPIA requests that cannot self-serve.  
- Stripe refunds (case-by-case per Refund Policy).  
- Import QA for new data sources.  
- Confirming account deletion when users email instead of using Profile.

## Issue reporting (internal)

Capture: URL, account email (if any), timestamp, steps, screenshot, browser/device.  
Label severity: blocker / major / minor.

## Beta feedback

- Encourage short feedback via Contact form subject `Beta feedback`.  
- Track themes weekly (search, billing, mobile, data quality).

## Escalation

- Security / data breach → founder + rotate secrets immediately.  
- Legal threats → pause public replies; escalate to counsel.
