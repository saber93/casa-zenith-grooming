# Casa Owner Demo Script

## Setup

Create an isolated demo business and users:

```bash
SUPABASE_DB_PASSWORD=... npm run demo:uat:create
```

The script prints:

- `runId`
- business slug
- one password for all demo users
- role-specific user emails
- cleanup command

Keep the generated credentials private. Delete the demo after the walkthrough.

## Demo Flow

1. Platform admin signs in.
2. Open `Businesses`.
3. Explain platform owner capabilities:
   - create/manage businesses
   - enter any business dashboard
   - manage platform-level access
4. Sign out and sign in as business owner.
5. Show owner dashboard access:
   - Business Settings
   - Staff
   - Reception
   - Bookings
   - Queue
   - Product Sales
   - Reports
6. Open `/admin/businesses`.
   - Expected: access denied.
   - Explain that owner access is business-scoped.
7. Sign in as reception.
   - Show Reception, Bookings, Queue.
   - Show Reports or Staff is denied.
8. Sign in as cashier.
   - Show Product Sales, Reception, Reports.
   - Explain cashier-session and checkout source-of-truth.
9. Sign in as barber.
   - Show Barber Workspace.
   - Confirm assigned barber workspace lock.
10. Sign in as viewer.
    - Show Queue Display only.
11. Open `/queue`.
    - Show public walk-in queue entry point.

## Demo Talking Points

- Casa is now multi-business ready: platform admins manage all businesses; owners manage only their business.
- Reception owns payment/checkout; staff hand off services through operational statuses.
- Financial reporting reads checkout transactions and ledger data.
- Queue display and barber workspace are practical salon-floor screens, not admin tables.
- Arabic routes remain RTL-ready.

## Cleanup

Use the cleanup command printed by the create script:

```bash
SUPABASE_DB_PASSWORD=... npm run demo:uat:cleanup -- <runId>
```
