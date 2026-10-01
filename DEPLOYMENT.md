# VibeCrafters EMS — Deployment Guide

This walks through taking the project from your laptop to a live, publicly accessible site:
**MongoDB Atlas** (database) → **Render/Railway** (backend API) → **Vercel** (frontend).

---

## Part 1 — Create your online MongoDB database (Atlas)

1. Go to **https://www.mongodb.com/cloud/atlas/register** and create a free account.
2. Click **"Build a Database"** → choose the **M0 Free** tier → pick a cloud provider/region close to you → **Create**.
3. **Create a database user:**
   - Go to *Database Access* (left sidebar) → **Add New Database User**
   - Choose "Password" authentication, set a username and a strong password (save these!)
   - Under "Database User Privileges," choose **Read and write to any database**
4. **Allow network access:**
   - Go to *Network Access* → **Add IP Address**
   - For simplicity during setup, click **Allow Access from Anywhere** (`0.0.0.0/0`). You can restrict this later.
5. **Get your connection string:**
   - Go to *Database* → click **Connect** on your cluster → **Drivers**
   - Copy the connection string, which looks like:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with the credentials from step 3, and add your database name before the `?`:
     ```
     mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/vibecrafters_ems?retryWrites=true&w=majority
     ```
   - This full string is your `MONGO_URI`.

---

## Part 2 — Set up Google OAuth (optional but requested)

1. Go to **https://console.cloud.google.com/** and create a new project (or use an existing one).
2. Go to **APIs & Services → OAuth consent screen** → choose "External" → fill in app name, support email → Save.
3. Go to **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Under **Authorized redirect URIs**, add (you'll finalize the real URL after deploying the backend in Part 3):
   ```
   http://localhost:5000/api/auth/google/callback
   https://YOUR-BACKEND-DOMAIN/api/auth/google/callback
   ```
6. Save. Copy the **Client ID** and **Client Secret** — these become `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

If you skip this section, the app still works fully with email/password login — the Google button will just show a friendly "not configured" message.

---

## Part 3 — Deploy the backend (Render — free tier)

Render is used here as it has a simple free tier; Railway works almost identically.

1. Push your project to a GitHub repository (Vercel/Render both deploy from Git).
2. Go to **https://render.com** → sign up/log in → **New → Web Service**.
3. Connect your GitHub repo, and set:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Under **Environment Variables**, add every variable from `backend/.env.example`, filled in with real values:
   ```
   MONGO_URI=<your Atlas connection string>
   JWT_SECRET=<a long random string>
   JWT_EXPIRES_IN=7d
   COOKIE_NAME=vc_token
   CLIENT_URL=https://YOUR-FRONTEND.vercel.app   (fill in after Part 4)
   GOOGLE_CLIENT_ID=<from Part 2, optional>
   GOOGLE_CLIENT_SECRET=<from Part 2, optional>
   GOOGLE_CALLBACK_URL=https://YOUR-BACKEND.onrender.com/api/auth/google/callback
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=<your email, optional — emails simulate/log if left blank>
   SMTP_PASS=<app password, optional>
   SMTP_FROM=VibeCrafters <no-reply@vibecrafters.com>
   ```
5. Click **Create Web Service**. Wait for the build/deploy to finish — you'll get a URL like:
   ```
   https://vibecrafters-ems-backend.onrender.com
   ```
6. **Seed the production database** (one-time): in Render's dashboard, open the service's **Shell** tab and run:
   ```
   npm run seed
   ```
7. Update the Google Cloud OAuth redirect URI (Part 2, step 5) to use this real Render URL instead of a placeholder.

> Note: Render's free tier "sleeps" after inactivity — the first request after idling takes ~30 seconds to wake up. This is expected on free hosting.

> Note on cookies: because the frontend (Vercel) and backend (Render) live on different domains, the login cookie is set with `sameSite: 'none'` + `secure: true` in production so it's still sent cross-site. This only works over HTTPS, which both Render and Vercel provide automatically — no extra setup needed on your part.

---

## Part 4 — Deploy the frontend (Vercel)

1. Go to **https://vercel.com** → sign up/log in with GitHub.
2. Click **Add New → Project** → import your repository.
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (should auto-detect)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Under **Environment Variables**, add:
   ```
   VITE_API_URL=https://YOUR-BACKEND.onrender.com/api
   VITE_SOCKET_URL=https://YOUR-BACKEND.onrender.com
   ```
5. Click **Deploy**. Once finished, you'll get a URL like:
   ```
   https://vibecrafters-ems.vercel.app
   ```
6. **Go back to Render** and update the backend's `CLIENT_URL` environment variable to this real Vercel URL, then redeploy/restart the backend service (this is required for CORS and OAuth redirects to work correctly).

---

## Part 5 — Final checklist

- [ ] Visit your Vercel URL — the site loads with the boot loader animation
- [ ] Register a new account (email/password) — check you receive/see the welcome email (or its dev-mode console log on Render if SMTP isn't configured)
- [ ] Log in with a seeded demo account and book a ticket — confirm the "ticket added" popup and QR code appear
- [ ] Test Google sign-in (if configured)
- [ ] Submit the Contact Us form and confirm it appears in MongoDB Atlas under the `contacts` collection
- [ ] As admin, send a test promotional email blast

---

## Ongoing costs

Everything above (MongoDB Atlas M0, Render free web service, Vercel free tier) can run at **$0/month** for a demo/small-scale deployment. For real production traffic, expect to upgrade Atlas (shared → dedicated cluster) and Render (free → paid, to avoid sleep/cold-starts) as usage grows.
