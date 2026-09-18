# Amna's Edit

Amna's Edit is a full-stack, inquiry-based fashion catalogue built with Next.js and Supabase. It combines a public editorial storefront with an owner-only administration area for managing products, variants, promotions, reviews, policies, and website settings.

> This project intentionally does **not** include a cart, checkout, online payment processing, or customer accounts. Customers browse products and contact the business directly through WhatsApp or Instagram.

## Live Demo

[amnas-edit.vercel.app](https://amnas-edit.vercel.app/)

## Features

### Public storefront

- Editorial home page with hero content, new arrivals, journal/story content, customer reviews, and contact calls-to-action
- Full product collection
- Search with fuzzy matching and abbreviation support
- Filters for:
  - product status
  - category
  - brand
  - gender
  - price range
- Product status labels:
  - In Stock
  - Coming In
  - Preorder / Sourced
- Product detail modal
- Product color / variant support
- Variant-specific image, details, and price
- Product recommendations
- Scheduled promotions and discount rules
- WhatsApp and Instagram inquiry links
- Approved customer reviews
- Public policies page

### Owner administration

The owner area is split into dedicated routes:

- `/admin` — overview and inventory statistics
- `/admin/products` — product and variant management
- `/admin/promotions` — promotion and rule management
- `/admin/reviews` — review moderation
- `/admin/settings` — website content, contact details, and policy settings

Owner functionality includes:

- Create, edit, and delete products
- Upload product and variant images to Supabase Storage
- Manage color variants
- Manage product status, gender, pricing, brand, and category relationships
- Create scheduled percentage or fixed-value promotions
- Target promotions by status, category, brand, gender, product, or all products
- Approve, hide, and delete customer reviews
- Edit About content
- Edit delivery, return, preorder, in-stock, customs-delay, privacy, and terms content
- Edit Instagram, WhatsApp, and TikTok contact details

## Tech Stack

- **Next.js 15**
- **React 19**
- **TypeScript**
- **Supabase**
  - PostgreSQL
  - Authentication
  - Row Level Security
  - Storage
- **Lucide React**
- **Vercel**

## Project Structure

```text
app/
├── admin/
│   ├── page.tsx
│   ├── products/page.tsx
│   ├── promotions/page.tsx
│   ├── reviews/page.tsx
│   └── settings/page.tsx
├── collection/page.tsx
├── login/page.tsx
├── policies/page.tsx
├── globals.css
├── layout.tsx
└── page.tsx

components/
├── AdminDashboard.tsx
├── Catalog.tsx
├── HomePage.tsx
├── Login.tsx
└── ProductModal.tsx

lib/
└── supabase.ts

supabase/
├── schema.sql
└── security_fix.sql

types/
└── product.ts
```

## Database Overview

The Supabase schema contains the following main tables:

- `profiles` — owner authorization
- `products` — main product records
- `categories` — product categories
- `brands` — product brands
- `product_variants` — color / variant records
- `site_settings` — editable site content and policies
- `promotions` — sale and promotion definitions
- `promotion_rules` — promotion targeting rules
- `product_reviews` — customer reviews and approval state

The schema also creates the public `product-images` Storage bucket used by the admin image uploader.

## Security

The application uses Supabase Row Level Security.

Public visitors can read storefront data and submit reviews, while product, promotion, settings, and moderation writes are restricted to an authenticated user whose `profiles.role` is `owner`.

The frontend uses only the Supabase **publishable** key.

Never commit:

- `.env.local`
- a Supabase service-role key
- private credentials
- owner passwords

## Environment Variables

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_WHATSAPP_NUMBER=923XXXXXXXXX
NEXT_PUBLIC_INSTAGRAM_URL=https://instagram.com/YOUR_INSTAGRAM
```

The WhatsApp and Instagram environment variables are used as fallbacks. The owner can manage the primary contact values from Website Settings.

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/AreebaZubair28/amnas-edit.git
cd amnas-edit
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a Supabase project

Create a Supabase project and run:

```text
supabase/schema.sql
```

in the Supabase SQL Editor.

### 4. Create the owner account

Create the owner under **Authentication → Users** in Supabase.

Then insert the user's UUID into `profiles`:

```sql
insert into public.profiles (id, role)
values ('YOUR-AUTH-USER-UUID', 'owner')
on conflict (id) do update
set role = 'owner';
```

Authentication alone does not grant administration access. Owner-only database writes are protected by Row Level Security.

### 5. Add brands

Categories are seeded by `schema.sql`.

Brands are business-specific, so add the required brand records to `public.brands` before creating products in the admin dashboard.

Example:

```sql
insert into public.brands (name, slug)
values ('Example Brand', 'example-brand')
on conflict (name) do nothing;
```

### 6. Configure environment variables

Copy:

```text
.env.example
```

to:

```text
.env.local
```

and add the Supabase project values.

### 7. Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Owner login:

```text
http://localhost:3000/login
```

## Production Build

Before deploying or pushing a stable milestone:

```bash
npm run build
```

The current project has been tested with a successful Next.js production build.

## Deployment

The project is designed for Vercel.

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add the required environment variables in Vercel.
4. Deploy.

Do not upload `.env.local` to GitHub or Vercel as a project file.

## Current Status

Implemented:

- public storefront
- editorial home page
- searchable/filterable catalogue
- reusable product detail modal
- product variants
- product recommendations
- scheduled promotions
- review submission and moderation
- editable policies and website settings
- owner authentication
- owner-only database writes through RLS
- product image uploads
- separate admin routes
- responsive layouts
- production build validation

## Possible Future Improvements

These are optional and are not required for the current version:

- brand and category management directly from the admin dashboard
- automated tests
- dedicated reusable modules for shared promotion logic
- Next.js Image optimization
- more granular loading/error states
- accessibility and performance audits
