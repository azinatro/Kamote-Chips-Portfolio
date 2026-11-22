# QamotyChips Preorder Website

A responsive preorder storefront and order-management demo for a small-batch kamote chips business.

## Features

- Mobile-friendly storefront with Cheese, Sour Cream, and BBQ flavors
- Size and quantity pricing
- GCash receipt upload flow (the live QR is intentionally omitted from this portfolio copy)
- Supabase-backed order storage and private receipt storage
- Admin dashboard for reviewing receipts and updating order status
- Customer status lookup using a unique tracking code

## Run locally

Open this folder in VS Code and use Live Server to open `index.html`. The backend is not connected until you configure your own Supabase project.

## Supabase setup

See `SETUP-Supabase.md` and `supabase/schema.sql`. Add your Project URL and publishable key to `supabase-config.js`, and replace `ADMIN_EMAIL_HERE` in the SQL with your admin email. Use only a publishable/anon key in browser code; never commit a service-role or secret key.

## Portfolio safety

This copy contains placeholder Supabase settings and a demo payment panel. It does not include the live GCash QR, the production project key, or the production admin email. Do not add real customer records or payment receipts to this repository.
