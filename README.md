# Amna's Edit

A full-stack, inquiry-based fashion catalogue built with **Next.js, React, TypeScript, Supabase, and PostgreSQL**.

The platform provides a responsive product catalogue with search and filtering,
product variants, recommendations, scheduled promotions, customer reviews,
business analytics, and an owner-only administration system.

> This project intentionally uses an inquiry-based model rather than traditional
> cart and checkout functionality. Customers browse products and contact the
> business through WhatsApp or Instagram.

## Live Demo

🌐 **[View Live Website](https://amnas-edit.vercel.app/)**

## Preview

### Home Page
![Amna's Edit Home Page](docs/home.png)

### Product Catalogue
![Product Catalogue](docs/catalogue.JPG)

### Owner Dashboard
![Owner Dashboard](docs/dashboard1.JPG)
![](docs/dashboard2.JPG)
![](docs/dashboard3.JPG)
![](docs/dashboard4.png)
![](docs/dashboard5.png)

## Features

### Storefront

- Editorial-style homepage
- New arrivals section
- Searchable and filterable product catalogue
- Product filtering by:
  - status
  - category
  - brand
  - gender
  - price range
- Product status labels:
  - In Stock
  - Sold Out
- Product detail modal
- Product color and variant support
- Variant-specific images, prices, and details
- Product recommendations
- Scheduled promotions and discount rules
- Customer reviews
- Public policies page
- WhatsApp and Instagram inquiry options
- Responsive mobile and desktop layouts
- SEO metadata, canonical URLs, sitemap, robots configuration, and social-sharing metadata
- Accessible keyboard navigation and modal interactions
- Catalogue categories synchronized with current product data

### Admin Dashboard

The owner dashboard provides dedicated sections for managing the website:

- `/admin` — dashboard overview and business analytics
- `/admin/products` — products and variants
- `/admin/promotions` — promotions and discount rules
- `/admin/reviews` — customer review moderation
- `/admin/settings` — website content, policies, contact information, brands, and categories

The owner can:

- Create, update, and delete products
- Upload product and variant images
- Manage product variants and colors
- Manage brands and categories
- Manage product pricing, gender, and availability
- Create scheduled promotions
- Apply promotions to products, categories, brands, genders, statuses, or the full catalogue
- Approve, hide, and delete reviews
- Edit website policies
- Edit About content
- Manage Instagram, WhatsApp, and other contact details
- View product-interest analytics

## Business Analytics

The admin dashboard includes privacy-conscious analytics for the most recent 30 days:

- Product views
- WhatsApp inquiry clicks
- Instagram inquiry clicks
- Total inquiry clicks
- Top products
- Top categories
- Top brands

The analytics feature stores only product interaction events. It does not store
customer names, emails, IP addresses, device identifiers, location data, or
browser fingerprints.

## Tech Stack

- **Next.js 16.3.8**
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
│   ├── layout.tsx
│   ├── page.tsx
│   ├── products/page.tsx
│   ├── promotions/page.tsx
│   ├── reviews/page.tsx
│   └── settings/page.tsx
├── collection/
│   ├── layout.tsx
│   └── page.tsx
├── login/
│   ├── layout.tsx
│   └── page.tsx
├── policies/
│   ├── layout.tsx
│   └── page.tsx
├── icon.tsx
├── opengraph-image.tsx
├── robots.ts
├── sitemap.ts
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
├── supabase.ts
└── supabase/
    ├── proxy.ts
    └── server.ts

supabase/
├── schema.sql
├── security_fix.sql
├── analytics.sql
└── status_in_stock_sold_out.sql

types/
└── product.ts

proxy.ts
```

## Database

The project uses Supabase PostgreSQL for application data.

Main tables include:

- `profiles`
- `products`
- `categories`
- `brands`
- `product_variants`
- `site_settings`
- `promotions`
- `promotion_rules`
- `product_reviews`
- `analytics_events`

Supabase Storage is used for product and variant images.

Row Level Security is used to restrict administrative operations to the owner account.

`schema.sql` contains the consolidated database schema for new setups.
Additional SQL files contain one-time migrations for security hardening,
analytics, and the current In Stock / Sold Out availability model.

## Getting Started

Clone the repository:

```bash
git clone https://github.com/AreebaZubair28/amnas-edit.git
cd amnas-edit
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file based on `.env.example` and add the required values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_WHATSAPP_NUMBER=your_whatsapp_number
NEXT_PUBLIC_INSTAGRAM_URL=your_instagram_url
NEXT_PUBLIC_SITE_URL=https://your-production-domain
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Database Setup

For a fresh setup, run:

```text
supabase/schema.sql
```

in the Supabase SQL Editor.

Create the owner account in Supabase Authentication and assign the `owner` role in the `profiles` table.

Example:

```sql
insert into public.profiles (id, role)
values ('YOUR-AUTH-USER-UUID', 'owner')
on conflict (id) do update
set role = 'owner';
```

For an existing database, apply the required one-time migrations from the
`supabase/` directory.

## Build

Before deploying or pushing a stable release:

```bash
npm audit
npm run build
```

## Security

The project uses:

- Supabase Authentication
- Server-side admin route protection
- Row Level Security
- Owner-only administrative permissions
- Environment-based configuration
- Restricted database write access
- Controlled product image uploads
- Owner-only analytics access

The frontend uses only the Supabase publishable key.

Never commit:

- `.env.local`
- Supabase service-role keys
- private credentials
- owner passwords

Project dependencies are regularly checked for known vulnerabilities using `npm audit`.

## SEO and Accessibility

The current version includes:

- Route-specific metadata
- Canonical URLs
- Open Graph and Twitter metadata
- Generated social preview image
- Site icon
- `robots.txt`
- `sitemap.xml`
- `noindex` protection for login and admin routes
- Keyboard-accessible product cards
- Accessible product modal with focus management
- Visible keyboard focus states
- Accessible names for filters and icon-only controls
- Reduced-motion support

## Project Status

The current production version includes:

- Complete public storefront
- Searchable and filterable catalogue
- In Stock / Sold Out availability model
- Product variants
- Product recommendations
- Scheduled promotions
- Customer review system
- Owner authentication
- Protected admin routes
- Brand and category management
- Website content and policy management
- Supabase Storage integration
- Business analytics
- SEO and social metadata
- Accessibility improvements
- Responsive layouts
- Production deployment on Vercel

## Future Improvements

Possible future enhancements include:

- Automated testing
- Reusable modules for shared promotion logic
- Further component refactoring
- More advanced analytics and reporting
- Automated backup and monitoring workflows
