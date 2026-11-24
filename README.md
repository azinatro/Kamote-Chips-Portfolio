# QamotyChips Preorder Website

A responsive preorder storefront and order-management project for a small-batch kamote chips business.

## Features

- Mobile-friendly storefront with Cheese, Sour Cream, and BBQ flavors
- Size and quantity pricing
- GCash preorder flow with private receipt storage (the real payment QR is intentionally omitted from this public portfolio copy)
- Supabase-backed order storage and private admin dashboard
- Order status management and a customer tracking page
- Tracking-code recovery using order name and contact information

## Run locally

Open this folder in VS Code and use Live Server to open `index.html`. The backend is not connected until you configure your own Supabase project.

## Supabase setup

See `SETUP-Supabase.md` and `supabase/schema.sql`. Add your Project URL and publishable key to `supabase-config.js`, and replace `ADMIN_EMAIL_HERE` in the SQL with your admin email. Use only a publishable/anon key in browser code; never commit a service-role or secret key.

## Privacy in this portfolio copy

This repository uses placeholder Supabase settings, omits the real GCash QR, and does not include the production admin email or customer orders/receipts. Tracking-code recovery matches the name and contact submitted with the order; use an additional verification step before using this recovery pattern with real customer data.
