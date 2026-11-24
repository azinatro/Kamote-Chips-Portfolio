# Connect Kamote Chips to Supabase

The storefront saves each preorder and its GCash receipt screenshot in Supabase. The private admin page is `admin.html`; buyers can check order status at `track-order.html` using their unique tracking code. Buyers who forget the code can enter the name and phone number used for the preorder to replace the latest matching order's code.

## 1. Create the database and private receipt storage

1. Open your Supabase project and go to **SQL Editor**.
2. Open `supabase/schema.sql` in VS Code.
3. Replace `ADMIN_EMAIL_HERE` in the SQL with the email you will use for the admin login.
4. Run the full SQL file in the Supabase SQL Editor. Run it again after downloading website updates so new database functions and policies are installed.

The receipt bucket is private. Anonymous visitors can submit a preorder and upload a receipt, but only the configured admin email can read orders and open receipt files.

## 2. Create the admin login

In Supabase, open **Authentication → Users** and create a user with the same email used in the SQL file. Use a strong password and keep it private. In Authentication settings, turn off public sign-ups if they are not needed.

## 3. Add the browser connection details

In the Supabase project settings, find the **Project URL** and the **publishable key** (or legacy `anon` key). Put them in `supabase-config.js`:

```js
window.SUPABASE_URL = "https://your-project.supabase.co";
window.SUPABASE_PUBLISHABLE_KEY = "your-publishable-key";
```

The publishable/anon key is meant for browser apps and is safe to include when the SQL security policies are in place. **Never put a `service_role` or secret key in this folder or in the website.**

## 4. Open the site and admin page

Use VS Code's Live Server extension or a website host to open `index.html`. A `file://` preview may not allow the browser scripts to connect correctly.

Open `admin.html` in the same hosted folder, sign in with the admin account, and choose **Enable alerts**. New orders appear in the dashboard and can trigger a browser notification while that page is open. Email or phone alerts need a separate notification service and are not configured yet.

## Order data saved

Each order stores the buyer's name and contact, flavor, size, quantity, total, notes, receipt file path, status, and a unique tracking code. The buyer sees the code after submitting and can use it on `track-order.html`. If they forget it, recovery checks the name and phone number and replaces the code on the latest matching preorder; the old code stops working. Anyone who knows both the exact preorder name and phone number can request this replacement, so use a phone verification service if you need stronger identity checks. The status lookup only returns order details and status, not the buyer's contact details or receipt. The total is calculated again by the database from the selected size and quantity. The receipt is not public.
