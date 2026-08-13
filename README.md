# Amna's Edit

A luxury catalogue website for Amna's Edit with:

- Public catalogue
- In Stock / Coming In / Preorder-Sourced statuses
- Category, brand and audience filters
- Product detail modal
- WhatsApp + Instagram inquiry buttons
- Owner-only login
- Owner CRUD dashboard
- Supabase PostgreSQL + Auth + Row Level Security

## 1. Requirements

Install Node.js 18+.

## 2. Create Supabase project

Create a project at Supabase.

Open SQL Editor and run:

`supabase/schema.sql`

Then create the owner account under Authentication > Users.

Copy that user's UUID and run:

```sql
insert into public.profiles (id, role)
values ('YOUR-AUTH-USER-UUID', 'owner')
on conflict (id) do update set role='owner';
```

This is important: the app does NOT treat every logged-in user as an owner. Database RLS checks the `profiles` table before allowing INSERT/UPDATE/DELETE.

## 3. Configure environment

Copy `.env.example` to `.env.local`.

Fill:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_WHATSAPP_NUMBER=923XXXXXXXXX
NEXT_PUBLIC_INSTAGRAM_URL=https://instagram.com/youraccount
```

Do not put a Supabase service-role/secret key in the frontend.

## 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

Owner dashboard:

http://localhost:3000/admin

## 5. Deploy

Push this project to GitHub and import it into Vercel. Add the same environment variables in Vercel.

## Notes

The first version deliberately uses image URLs so the app works immediately without exposing storage credentials. If you want, Supabase Storage can be added later for direct image uploads, multiple gallery images, drag-and-drop ordering, and automatic image optimization.

For WhatsApp, set the number in international format without `+`, e.g. `923001234567`.


## Direct image uploads

The Admin Dashboard now supports uploading product images directly from the computer. Supabase Storage bucket `product-images` is created by the SQL schema. Only the owner can upload, update, or delete stored images; public visitors can view them. The admin also keeps an image-URL fallback.
