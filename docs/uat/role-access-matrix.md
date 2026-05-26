# Casa Role Access Matrix

This matrix is for owner demos and UAT. It reflects the current frontend route guard and business-scoped role model.

| Area                                    | Platform Admin | Business Owner      | Business Admin      | Reception           | Cashier             | Barber                    | Viewer              | Public                  |
| --------------------------------------- | -------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------------------- | ------------------- | ----------------------- |
| `/admin/businesses` platform businesses | Allow          | Deny                | Deny                | Deny                | Deny                | Deny                      | Deny                | Deny                    |
| Business switcher                       | All businesses | Assigned businesses | Assigned businesses | Assigned businesses | Assigned businesses | Assigned businesses       | Assigned businesses | N/A                     |
| `/admin/business-settings`              | Allow          | Allow               | Allow               | Deny                | Deny                | Deny                      | Deny                | Deny                    |
| `/admin/staff`                          | Allow          | Allow               | Allow               | Deny                | Deny                | Deny                      | Deny                | Deny                    |
| `/admin/reception`                      | Allow          | Allow               | Allow               | Allow               | Allow               | Deny                      | Deny                | Deny                    |
| `/admin/bookings`                       | Allow          | Allow               | Allow               | Allow               | Allow               | Deny                      | Deny                | Public reservation only |
| `/admin/queue`                          | Allow          | Allow               | Allow               | Allow               | Allow               | Deny                      | Deny                | Public queue only       |
| `/admin/barber-workspace`               | Allow          | Allow               | Allow               | Deny                | Deny                | Allow own assigned barber | Deny                | Deny                    |
| `/admin/product-sales`                  | Allow          | Allow               | Allow               | Deny                | Allow               | Deny                      | Deny                | Deny                    |
| `/admin/reports`                        | Allow          | Allow               | Allow               | Deny                | Allow               | Deny                      | Deny                | Deny                    |
| `/admin/queue-display`                  | Allow          | Allow               | Allow               | Allow               | Allow               | Allow                     | Allow               | Deny                    |
| `/queue` and `/ar/queue`                | Public         | Public              | Public              | Public              | Public              | Public                    | Public              | Allow                   |
| `/reservation` and `/ar/reservation`    | Public         | Public              | Public              | Public              | Public              | Public                    | Public              | Allow                   |

Notes:

- `user_roles.admin` and `user_roles.platform_admin` are platform-level.
- Business roles live in `business_memberships`.
- New owner onboarding must not create `user_roles.admin` for the owner.
- Full RLS hardening is still a separate future security milestone; UAT checks frontend and key RPC behavior.
