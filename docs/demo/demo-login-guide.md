# Casa Owner Demo Login Guide

## Demo Run ID

`owner-demo-20260525-casa-spa`

## Demo Businesses

- Casa Gents Salon Demo
  - Slug: `owner-demo-20260525-casa-spa-casa-gents`
  - Business type: `gents_salon`
  - Visible terminology: Barber

- Serenity Spa Demo
  - Slug: `owner-demo-20260525-casa-spa-spa`
  - Business type: `spa`
  - Visible terminology: Therapist

## Demo Users

Password for all demo users:

`CasaOwnerDemo2026!`

| Role | Email |
| --- | --- |
| Platform Admin | `owner-demo-20260525-casa-spa-platform-admin@example.test` |
| Casa Owner | `owner-demo-20260525-casa-spa-casa-owner@example.test` |
| Casa Admin | `owner-demo-20260525-casa-spa-casa-admin@example.test` |
| Casa Reception | `owner-demo-20260525-casa-spa-casa-reception@example.test` |
| Casa Cashier | `owner-demo-20260525-casa-spa-casa-cashier@example.test` |
| Casa Barber | `owner-demo-20260525-casa-spa-casa-barber@example.test` |
| Casa Viewer | `owner-demo-20260525-casa-spa-casa-viewer@example.test` |
| Spa Owner | `owner-demo-20260525-casa-spa-spa-owner@example.test` |
| Spa Admin | `owner-demo-20260525-casa-spa-spa-admin@example.test` |
| Spa Reception | `owner-demo-20260525-casa-spa-spa-reception@example.test` |
| Spa Cashier | `owner-demo-20260525-casa-spa-spa-cashier@example.test` |
| Spa Therapist | `owner-demo-20260525-casa-spa-spa-therapist@example.test` |
| Spa Viewer | `owner-demo-20260525-casa-spa-spa-viewer@example.test` |

## Demo Flow

1. Log in as Platform Admin.
2. Open Businesses and confirm both demo businesses exist.
3. Switch into Casa Gents Salon Demo and show Barber terminology.
4. Review services, staff, bookings, queue, reception, products, reports, cashier sessions, and financial data.
5. Log in as Casa Barber and open the barber workspace.
6. Log in as Spa Owner.
7. Confirm the Spa dashboard uses Therapist terminology.
8. Review Spa services, staff, queue, reception, products, reports, memberships, wallets, packages, discounts, suppliers, and expenses.
9. Log in as Spa Therapist and open the workspace to show the same internal route with therapist-facing labels.

## Cleanup

```bash
SUPABASE_DB_PASSWORD=... npm run demo:owner:cleanup -- owner-demo-20260525-casa-spa
```

To verify seeded data before or after cleanup:

```bash
SUPABASE_DB_PASSWORD=... npm run demo:owner:verify -- owner-demo-20260525-casa-spa
```
