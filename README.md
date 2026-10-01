# VibeCrafters — Event Management System (MERN)

A full-stack Event Management System built for VibeCrafters (Event Design & Curation), covering
Modules 1–7 from the project documentation: User & Role Management, Event Creation, Ticketing &
QR e-tickets, Payments, Vendor/Venue Management, Notifications & Chat, and Reporting/Analytics.

Brand colors are pulled directly from the VibeCrafters logo: deep navy `#0F2A3D`, magenta `#C81E6E`,
ember orange `#F5811F`, and cream `#FBF7EF`, with Space Grotesk + Inter typography.

## Stack

- **Frontend:** React 18 (Vite), React Router, Context API, Tailwind CSS, Motion (motion.dev), Recharts, Socket.io-client
- **Backend:** Node.js, Express, MongoDB + Mongoose, JWT (httpOnly cookies), Passport.js (Google OAuth), bcrypt.js, Socket.io, qrcode, node-cron
- **Payments:** booking is instant — no checkout/payment-gateway step. A "paid" record is logged
  automatically for revenue reporting and refunds.
- **Notifications:** Nodemailer (branded HTML emails: welcome, booking confirmation, event reminders, special offers), in-app Socket.io push notifications

## Project structure

```
vibecrafters-ems/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── models/          # User, Event, Venue, Vendor, TicketType, Ticket, Payment, Notification, Feedback, ChatMessage
│   ├── middleware/       # JWT auth + RBAC, error handler
│   ├── controllers/      # Business logic per module
│   ├── routes/           # REST endpoints
│   ├── sockets/          # Socket.io chat + live notifications
│   ├── utils/            # JWT, QR generation, email, seed script
│   └── server.js
└── frontend/
    └── src/
        ├── api/          # axios instance + socket client
        ├── context/      # AuthContext (global auth state)
        ├── components/   # Navbar, Footer, EventCard, NotificationBell, etc.
        └── pages/         # Home, Events, EventDetails, Receipt, MyTickets,
                            # organizer/ (incl. EditEvent, AttendeesList), admin/, vendor/ dashboards
```

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in MONGO_URI, JWT_SECRET, etc.
npm install
npm run seed               # optional: creates demo users, 3 venues, and 21 events (3 per category)
npm run dev                # starts API on http://localhost:5000
```

Demo logins after seeding:

| Role      | Email                        | Password        |
|-----------|-------------------------------|------------------|
| Admin     | admin@vibecrafters.com        | Admin@123        |
| Organizer | organizer@vibecrafters.com    | Organizer@123    |
| Vendor    | vendor@vibecrafters.com       | Vendor@123       |
| Attendee  | attendee@vibecrafters.com     | Attendee@123     |

The seed also creates **21 published events — 3 in each of the 7 categories** (conference, concert,
wedding, corporate, festival, workshop, other), spread across 3 venues in different cities with
varied dates, agendas, and ticket tiers, so Explore Events and the category filter have real
content to browse immediately.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                # starts app on http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:5000`, so no CORS
configuration is needed locally.

### 3. Production notes

- Booking is instant with no payment gateway wired in — if you need real payment collection
  (rather than just recording a "paid" entry for reporting), add Razorpay/Stripe SDK calls to
  `backend/controllers/ticketController.js`'s `bookTickets` before it creates the Payment record.
- Add `CLOUDINARY_*` env vars and wire `multer` + `cloudinary` for banner/avatar uploads.
- Add `TWILIO_*` env vars to send real SMS reminders.
- Deploy backend to Render/Railway, frontend to Vercel/Netlify, and database to MongoDB Atlas —
  matching the deployment plan in the project documentation.

## Role-based experience

- **Admin:** platform-wide analytics, revenue trend chart, vendor approvals, promotional email blasts,
  contact-form message inbox.
- **Organizer:** KPI dashboard, multi-step event creation wizard (details → schedule → agenda → tickets),
  a shared **venue directory** (add venues, pick one when creating/editing an event, with automatic
  double-booking prevention), publish/draft workflow, per-event sales breakdown, full **event editing**
  (details, agenda, venue, and individual ticket tiers — add, update price/quantity, or delete unsold
  tiers), draft deletion, and an **attendee roster** per event (who booked, which tier, amount paid,
  check-in status) with a built-in chat to message any attendee directly.
- **Vendor:** service onboarding form, a **"My listings" section separate from the directory**
  with full edit capability for their own submissions, and read-only visibility into other
  approved vendors.
- **Attendee:** event discovery & search, instant ticket booking with promo codes (no checkout step),
  an immediate receipt with a downloadable branded PDF ticket, "My Tickets" with QR e-tickets for
  check-in, ticket cancellation, in-app chat with the event's organizer, Google or email/password sign-in.

## Public pages

Beyond the dashboards, the site includes **Gallery** (a lightbox photo grid pulled from published
event banners), **About Us** (brand story + stats), and **Contact Us** (a form that saves to the
database and emails the sender an acknowledgement).

## Motion & visual design

Built with [Motion](https://motion.dev) (the successor to Framer Motion) throughout: a branded
page loader on first visit and on every navigation, a scroll progress bar, animated KPI counters,
a shared-layout ticket-tier selector, a confetti "ticket added" popup, and lightweight CSS/Motion
3D effects (a floating tilted ticket in the hero, mouse-tracking tilt cards with a glare sheen) —
all in the VibeCrafters brand palette, without a heavy WebGL dependency.

## Real-time features

Socket.io powers a personal notification "inbox" room for every logged-in user (live alerts on
booking confirmation, event changes, chat messages) plus a **working chat widget** between an
event's organizer and its attendees — attendees open it from "My Tickets" (per ticket), organizers
open it from an event's Attendees list (per attendee). Message history is persisted and fetched
via REST (`/api/chat/...`) on open, then new messages stream in live over the socket. Authorization
is enforced identically on both the REST and socket paths: one participant must be the event's
organizer, the other must hold an actual ticket to it.

## Email notifications

Branded HTML emails are sent for: welcome (on signup), booking confirmation (on successful payment),
event reminders (an hourly cron job checks for events starting in ~24 hours and emails all
ticket-holders), and admin-triggered special-offer blasts. All templates live in `backend/utils/email.js`.
If `SMTP_USER` isn't set, emails are logged to the console instead of sent — useful for local dev.

## Security

This project includes several hardening measures beyond basic auth:

- **NoSQL injection protection** — a global sanitizer middleware strips any request field
  containing `$` or `.` from `body`/`query`/`params` before it reaches a controller, preventing
  Mongo-operator injection through crafted query strings (e.g. `?category[$ne]=null`).
- **Rate limiting** — tiered limits: 300 req/15min globally, a stricter 20 req/15min on
  login/register/password-reset, and 5 req/hour on the public contact form (which sends email to
  an address the caller controls, so it's a spam/abuse vector without a tight limit).
- **Whitelisted updates everywhere** — every "edit" endpoint (events, vendors, venues, profile)
  explicitly lists which fields a request is allowed to touch, rather than blindly applying the
  request body to the document. This closes several privilege-escalation paths (e.g. a vendor
  self-approving their own listing, or an event edit request sneaking in a `status` or `organizer`
  change).
- **Race-condition-free ticket inventory** — booking uses a single atomic MongoDB
  `findOneAndUpdate` (guarded by `$expr`) to check-and-reserve seats in one indivisible step,
  instead of a read-then-write pattern that could let two simultaneous bookings both succeed for
  the last remaining ticket. A rollback path returns reserved seats if anything fails afterward
  (e.g. QR generation). Run `node utils/testConcurrency.js` from `backend/` (with MongoDB running)
  to verify this yourself under real simultaneous load — it fires 20 concurrent bookings at a
  5-seat tier and asserts exactly 5 succeed.
- **Ownership checks on every mutation** — editing, deleting, or checking in tickets for an event
  is restricted to that event's own organizer or an admin, not any organizer.
- **Draft-only deletion** — a published event with real tickets/payments attached can't be deleted
  outright (only cancelled), protecting referential integrity.
- **Chat authorization** — the Socket.io chat only allows a message between two users if one of
  them is the event's organizer and the other holds an actual ticket to that event.
- **HTML-escaped email templates** — user-supplied text (contact form messages, names) is escaped
  before being embedded in outgoing HTML emails.
- **Server-side password policy** — 8-character minimum enforced on both registration and password
  reset, not just in the frontend form.
- **Cross-domain cookie handling** — `sameSite: 'none'` + `secure: true` in production (frontend
  and backend live on different domains after deployment), `lax` + non-secure in local dev.
- **Draft/cancelled events are private** — only visible to their owning organizer or an admin, not
  publicly guessable by URL.
- **Tiered vendor visibility** — the public and other vendors only ever see approved vendor
  listings (an unapproved submission's contact details aren't exposed before an admin vets it); a
  vendor can still see their own pending listing, and an admin sees everything.
- **Cross-tenant report leak closed** — the per-event sales/feedback report endpoint had no
  ownership check, so any self-registered organizer account could pull another organizer's
  revenue-by-tier breakdown by guessing an event ID. Now scoped to the event's own organizer or
  an admin.
- **Double-cancellation inventory corruption closed** — cancelling a ticket never checked whether
  it was already cancelled, so calling the cancel endpoint repeatedly on the same ticket
  decremented sold-inventory every time, eventually reporting deeply incorrect (even negative)
  availability. Now a ticket can only be cancelled once, from a `booked` state.
- **Silent event cap fixed** — Explore Events had a hardcoded 24-event limit and no pagination UI,
  meaning any event beyond the 24th would have been permanently invisible with no indication more
  existed. Now paginates properly with a "Load more" button, using the pagination the backend
  already supported.

## Performance

Routes are code-split with `React.lazy` — the initial JS bundle only contains the landing page and
shared chrome (~420 KB); every other page (dashboards, booking flow, etc.) loads its own chunk on
first visit. The heaviest dependency (Recharts, used only by the admin analytics page) is isolated
into its own ~390 KB chunk that never loads for attendees or organizers. The existing branded
`PageLoader` doubles as the Suspense fallback, so a slow chunk fetch never shows a blank flash.

## Recently added functionality

- **Account settings** (`/profile`, any logged-in role) — update name, phone, avatar, and change
  your password (hidden automatically for Google-only accounts, which have no password to change).
- **Feedback & ratings** — attendees can rate an event with an animated star widget once it has
  actually ended, directly from "My Tickets." Validated server-side (whole number 1–5) and
  restricted to people who actually held a ticket, since `findOneAndUpdate` with `upsert` bypasses
  Mongoose schema validators — without an explicit check, a crafted request could have written an
  out-of-range rating straight into the average shown on organizer/admin reports.
- **Ratings are now visible where they matter** — the average rating (from that same feedback
  data) now shows as a star badge on event cards across Explore Events and Home, and next to the
  title on the event detail page — closing the loop between collecting feedback and actually
  using it to help people decide what to book. Computed via a single batched aggregation per page
  of results, not a query per event, and stays hidden entirely for events with no reviews yet
  rather than showing a discouraging "★ 0.0 (0)".
- **Admin user management** (`/admin/users`) — search, filter by role, and deactivate/reactivate
  any account (an admin can't deactivate their own, to avoid locking every admin out).

## Motion coverage

Every page in the app now uses [Motion](https://motion.dev) for its entrance and interaction
animations — the last three holdouts (`NotFound`, `AuthCallback`, `Events`) have been brought in
line with the rest: staggered fade-ins, a spring-bounced 404 glyph, animated empty/loading states,
and a smooth cross-fade when search or category filters change.

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step guide to hosting this on
MongoDB Atlas + Render (backend) + Vercel (frontend), including Google OAuth and SMTP setup.

