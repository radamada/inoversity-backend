# Inoversity Backend

API REST NestJS pentru platforma de cursuri online Inoversity.

## Stack

NestJS, Mongoose (MongoDB Atlas), JWT (access + refresh), Stripe (PaymentIntent + webhook), Bunny.net Stream (video CDN), Nodemailer (SMTP), Helmet, Throttler, Pino logging.

## Module principale

`auth`, `users`, `courses`, `categories`, `cart`, `orders`, `payments`, `enrollments`, `reviews`, `wishlist`, `coupons`, `media`, `notifications`, `notes`, `stats`, `contact`, `instructor`, `admin`, `mail`.

## Setup local

1. **Clone și instalare:**
   ```bash
   git clone https://github.com/radamada/inoversity-backend.git
   cd inoversity-backend
   npm install
   ```

2. **Configurare environment:**
   ```bash
   cp .env.example .env
   ```
   Editează `.env`. Variabilele critice fără default:
   - `MONGODB_URI` — connection string MongoDB Atlas
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — minim 32 caractere
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — pentru plăți
   - `BUNNY_*` — CDN media
   - `SMTP_*` — email transactional
   - `GOOGLE_OAUTH_*` — login Google

3. **Pornire dev server:**
   ```bash
   npm run start:dev
   ```
   API rulează la `http://localhost:3001/api`. Swagger docs la `http://localhost:3001/api/docs`.

## Frontend

Codul frontend e separat în [inoversity-frontend](https://github.com/radamada/inoversity-frontend). Frontend-ul citește `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).

## Documentație

`docs/superpowers/specs/` și `docs/superpowers/plans/` conțin design docs istorice (rebrand-ul EduInovatrium → Inoversity). Path-urile `backend/...` din ele sunt din monorepo-ul original; în repo-ul curent codul începe de la `src/`.

## Comenzi utile

| Comandă | Descriere |
|---|---|
| `npm run start:dev` | Dev server cu watch mode |
| `npm run build` | Compile TS în `dist/` |
| `npm run start:prod` | Pornește production build |
| `npx tsc --noEmit` | Type-check fără emit |
