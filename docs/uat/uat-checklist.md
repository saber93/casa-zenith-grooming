# Casa Full Role-Based UAT Checklist

Use a unique run id such as `uat-demo-{timestamp}`. Run the automated smoke first, then do a focused manual walkthrough.

## Commands

```bash
npx tsc --noEmit
npm run lint
npm run build
SUPABASE_DB_PASSWORD=... npm run test:uat
```

## Demo Data

- [ ] Business exists with unique slug.
- [ ] Working days exist.
- [ ] Modules exist.
- [ ] Services exist.
- [ ] Products exist.
- [ ] Therapist/barber exists.
- [ ] Queue ticket exists.
- [ ] Demo users exist for every role.
- [ ] Cleanup command removes all demo records.

## Platform Admin

- [ ] Can access `/admin/businesses`.
- [ ] Can access selected business dashboard.
- [ ] Can switch businesses.
- [ ] Can access staff, settings, reports, reception, queue, bookings.

## Business Owner

- [ ] Can access assigned business dashboard.
- [ ] Cannot access `/admin/businesses`.
- [ ] Cannot switch to unassigned business.
- [ ] Can access business settings.
- [ ] Can access staff management for own business.
- [ ] Can access reception, bookings, queue, product sales, reports.

## Business Admin

- [ ] Can access own business operational pages.
- [ ] Can access staff/settings.
- [ ] Cannot access platform businesses.
- [ ] Cannot switch to unassigned business.

## Reception

- [ ] Can access reception.
- [ ] Can access bookings.
- [ ] Can access queue.
- [ ] Can access queue display.
- [ ] Cannot access reports, staff, business settings, platform businesses.

## Cashier

- [ ] Can access reception.
- [ ] Can access product sales.
- [ ] Can access reports if intended.
- [ ] Cannot access staff or platform businesses.

## Barber

- [ ] Can access barber workspace.
- [ ] Workspace shows assigned barber lock.
- [ ] Can access queue display.
- [ ] Cannot access reception, reports, staff, or platform businesses.

## Viewer

- [ ] Can access queue display.
- [ ] Cannot access operational mutation pages.
- [ ] Cannot access reports, reception, staff, or platform businesses.

## Public Customer

- [ ] `/queue` loads without login.
- [ ] `/ar/queue` loads RTL without login.
- [ ] `/reservation` loads without login.
- [ ] `/ar/reservation` loads RTL without login.

## Arabic / RTL

- [ ] `/ar/admin/business-settings` is RTL.
- [ ] `/ar/admin/queue-display` is RTL.
- [ ] `/ar/queue` is RTL.

## Final Gate

- [ ] No unexpected console errors in role smoke.
- [ ] Demo data cleanup confirmed.
- [ ] Remaining RLS limitations documented for future security hardening.
