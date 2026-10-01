require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Vendor = require('../models/Vendor');
const Event = require('../models/Event');
const TicketType = require('../models/TicketType');

// Days from now each event starts — spread out so the list feels realistic (some soon, some later)
const inDays = (d, h = 0) => new Date(Date.now() + d * 24 * 60 * 60 * 1000 + h * 60 * 60 * 1000);

/**
 * 3 events per category (21 total). `banner` uses Picsum's seeded endpoint — a stable
 * placeholder image service that never 404s, unlike guessing a specific Unsplash photo ID.
 * Each event gets 3 ticket tiers (Early Bird / General / VIP) at category-appropriate pricing.
 */
const buildEvents = (organizerId, venueIds, vendorId) => [
  // ---- conference ----
  {
    title: 'TechSpark Summit 2026',
    description:
      'A full-day gathering for developers, designers, and product leaders exploring the future of AI-driven software. Hands-on workshops, live product demos, and candid talks from engineers building at scale.',
    category: 'conference',
    banner: 'techspark-2026',
    venue: venueIds[1],
    startDt: inDays(18, 9),
    endDt: inDays(18, 18),
    agenda: [
      { time: '09:00', title: 'Registration & Breakfast' },
      { time: '10:00', title: 'Opening Keynote: The Next Decade of AI', speaker: 'Ritika Shah' },
      { time: '14:00', title: 'Workshop: Building with LLM Agents', speaker: 'Devraj Mehta' },
      { time: '16:30', title: 'Panel: Scaling Products Responsibly', speaker: 'Aanya Kapoor' },
    ],
    tags: ['tech', 'ai', 'developers'],
    tiers: [
      { name: 'Early Bird', price: 999, quantity: 80 },
      { name: 'General', price: 1499, quantity: 250 },
      { name: 'VIP', price: 3499, quantity: 40 },
    ],
  },
  {
    title: 'Women in Business Leadership Conference',
    description:
      'A day of candid conversations with founders, CXOs, and investors on building resilient companies and resilient careers, followed by curated networking over lunch.',
    category: 'conference',
    banner: 'women-leadership-2026',
    venue: venueIds[2],
    startDt: inDays(32, 9),
    endDt: inDays(32, 17),
    agenda: [
      { time: '09:30', title: 'Welcome & Networking Breakfast' },
      { time: '11:00', title: 'Fireside Chat: Scaling from 0 to Series B', speaker: 'Meera Iyer' },
      { time: '13:00', title: 'Lunch & Roundtables' },
      { time: '15:00', title: 'Closing Keynote', speaker: 'Farah Kapadia' },
    ],
    tags: ['leadership', 'business', 'networking'],
    tiers: [
      { name: 'Early Bird', price: 799, quantity: 60 },
      { name: 'General', price: 1199, quantity: 180 },
      { name: 'VIP', price: 2799, quantity: 30 },
    ],
  },
  {
    title: 'HealthTech Innovation Summit',
    description:
      'Clinicians, founders, and researchers share what it actually takes to bring digital health products from prototype to patients — with live demos from the latest diagnostic and wellness startups.',
    category: 'conference',
    banner: 'healthtech-2026',
    venue: venueIds[0],
    startDt: inDays(45, 9),
    endDt: inDays(45, 17),
    agenda: [
      { time: '09:00', title: 'Registration' },
      { time: '10:00', title: 'Keynote: The Future of Preventive Care', speaker: 'Dr. Aniket Rao' },
      { time: '12:30', title: 'Startup Demo Showcase' },
      { time: '15:00', title: 'Panel: Regulation & Innovation' },
    ],
    tags: ['healthtech', 'innovation', 'startups'],
    tiers: [
      { name: 'Early Bird', price: 899, quantity: 50 },
      { name: 'General', price: 1399, quantity: 150 },
      { name: 'VIP', price: 2999, quantity: 25 },
    ],
  },

  // ---- concert ----
  {
    title: 'Aurora Skies — Live in Concert',
    description:
      'Aurora Skies brings their chart-topping synth-pop sound to the stage for one night only, with a full live band and an immersive light show designed in-house by VibeCrafters.',
    category: 'concert',
    banner: 'aurora-skies-2026',
    venue: venueIds[1],
    startDt: inDays(21, 19),
    endDt: inDays(21, 23),
    agenda: [
      { time: '19:00', title: 'Doors Open' },
      { time: '20:00', title: 'Opening Act', speaker: 'The Midnight Collective' },
      { time: '21:00', title: 'Aurora Skies — Full Set' },
    ],
    tags: ['music', 'live', 'pop'],
    tiers: [
      { name: 'General Standing', price: 899, quantity: 400 },
      { name: 'Reserved Seating', price: 1799, quantity: 150 },
      { name: 'VIP + Meet & Greet', price: 4499, quantity: 25 },
    ],
  },
  {
    title: 'Symphony Under the Stars',
    description:
      'An open-air evening with the full city philharmonic performing classical favorites alongside contemporary film scores, under a canopy of string lights.',
    category: 'concert',
    banner: 'symphony-2026',
    venue: venueIds[2],
    startDt: inDays(28, 18),
    endDt: inDays(28, 21),
    agenda: [
      { time: '18:00', title: 'Gates Open — Picnic Seating Available' },
      { time: '19:00', title: 'Act I: Classical Favorites' },
      { time: '20:15', title: 'Act II: Film Score Night' },
    ],
    tags: ['orchestra', 'classical', 'outdoor'],
    tiers: [
      { name: 'Lawn Seating', price: 599, quantity: 300 },
      { name: 'Premium Seating', price: 1299, quantity: 120 },
      { name: 'VIP Box', price: 2999, quantity: 20 },
    ],
  },
  {
    title: 'Indie Sound Sessions',
    description:
      'A curated night of up-and-coming indie and alternative acts, in an intimate venue built for discovering your new favorite band before everyone else does.',
    category: 'concert',
    banner: 'indie-sessions-2026',
    venue: venueIds[0],
    startDt: inDays(12, 19),
    endDt: inDays(12, 23),
    agenda: [
      { time: '19:00', title: 'Doors Open' },
      { time: '19:30', title: 'Set 1', speaker: 'Paper Planes' },
      { time: '20:30', title: 'Set 2', speaker: 'Hollow Coast' },
      { time: '21:30', title: 'Headline Set', speaker: 'Nova Lane' },
    ],
    tags: ['indie', 'alternative', 'live'],
    tiers: [
      { name: 'General Admission', price: 449, quantity: 200 },
      { name: 'Front Row', price: 899, quantity: 40 },
    ],
  },

  // ---- wedding ----
  {
    title: 'The Grand Wedding Expo 2026',
    description:
      'VibeCrafters\' flagship wedding showcase — meet top venues, photographers, decorators, and caterers all in one place, with live styling demos and seasonal bridal collections on display.',
    category: 'wedding',
    banner: 'wedding-expo-2026',
    venue: venueIds[2],
    startDt: inDays(25, 10),
    endDt: inDays(25, 19),
    agenda: [
      { time: '10:00', title: 'Doors Open — Vendor Showcase Floor' },
      { time: '12:00', title: 'Live Styling Demo: Mandap Design Trends' },
      { time: '15:00', title: 'Bridal Fashion Walk' },
    ],
    tags: ['wedding', 'expo', 'vendors'],
    tiers: [
      { name: 'General Entry', price: 199, quantity: 400 },
      { name: 'Couple Pass + Goodie Bag', price: 499, quantity: 150 },
    ],
  },
  {
    title: 'Bridal Couture & Beauty Showcase',
    description:
      'An afternoon dedicated to bridal fashion, makeup artistry, and jewelry — featuring runway presentations from leading regional designers and live beauty consultations.',
    category: 'wedding',
    banner: 'bridal-couture-2026',
    venue: venueIds[1],
    startDt: inDays(38, 12),
    endDt: inDays(38, 18),
    agenda: [
      { time: '12:00', title: 'Designer Showcase Opens' },
      { time: '14:00', title: 'Runway Presentation' },
      { time: '16:00', title: 'Beauty Masterclass' },
    ],
    tags: ['bridal', 'fashion', 'beauty'],
    tiers: [
      { name: 'General Entry', price: 249, quantity: 250 },
      { name: 'VIP Front Row', price: 699, quantity: 60 },
    ],
  },
  {
    title: 'Destination Wedding Planning Fair',
    description:
      'Planning a wedding away from home? Meet destination venues, travel coordinators, and planners specializing in beach, hill-station, and heritage-property weddings.',
    category: 'wedding',
    banner: 'destination-wedding-2026',
    venue: venueIds[0],
    startDt: inDays(50, 11),
    endDt: inDays(50, 17),
    agenda: [
      { time: '11:00', title: 'Fair Opens' },
      { time: '13:00', title: 'Talk: Planning a Destination Wedding on Budget' },
      { time: '15:30', title: 'One-on-One Planner Consultations' },
    ],
    tags: ['destination', 'wedding', 'planning'],
    tiers: [
      { name: 'General Entry', price: 149, quantity: 300 },
      { name: 'Couple Consultation Pass', price: 399, quantity: 100 },
    ],
  },

  // ---- corporate ----
  {
    title: 'Annual Sales Kickoff Gala',
    description:
      'A high-energy night celebrating the year\'s top performers, with dinner, awards, and a keynote from leadership on next year\'s vision — closed with a live band and dancing.',
    category: 'corporate',
    banner: 'sales-kickoff-2026',
    venue: venueIds[1],
    startDt: inDays(15, 19),
    endDt: inDays(15, 23),
    agenda: [
      { time: '19:00', title: 'Cocktail Reception' },
      { time: '20:00', title: 'Dinner & Awards Ceremony' },
      { time: '21:30', title: 'Leadership Keynote' },
      { time: '22:00', title: 'Live Band & Dancing' },
    ],
    tags: ['corporate', 'gala', 'awards'],
    tiers: [
      { name: 'Team Member', price: 0, quantity: 300 },
      { name: 'Guest Pass', price: 499, quantity: 80 },
    ],
  },
  {
    title: 'Corporate Innovation Awards Night',
    description:
      'Recognizing the boldest internal projects of the year across engineering, design, and operations — with finalist showcases and a judged awards ceremony.',
    category: 'corporate',
    banner: 'innovation-awards-2026',
    venue: venueIds[2],
    startDt: inDays(40, 18),
    endDt: inDays(40, 22),
    agenda: [
      { time: '18:00', title: 'Finalist Showcase' },
      { time: '19:30', title: 'Dinner' },
      { time: '20:30', title: 'Awards Ceremony' },
    ],
    tags: ['corporate', 'innovation', 'awards'],
    tiers: [
      { name: 'Employee', price: 0, quantity: 200 },
      { name: 'Guest', price: 599, quantity: 50 },
    ],
  },
  {
    title: 'Leadership Offsite Retreat',
    description:
      'A two-day retreat for senior leadership combining strategy workshops, team-building activities, and facilitated planning sessions for the year ahead.',
    category: 'corporate',
    banner: 'leadership-retreat-2026',
    venue: venueIds[0],
    startDt: inDays(55, 9),
    endDt: inDays(56, 17),
    agenda: [
      { time: '09:00', title: 'Day 1: Strategy Workshop' },
      { time: '14:00', title: 'Day 1: Team-Building Activities' },
      { time: '09:00', title: 'Day 2: Planning Session' },
    ],
    tags: ['corporate', 'leadership', 'retreat'],
    tiers: [
      { name: 'Leadership Pass', price: 0, quantity: 40 },
    ],
  },

  // ---- festival ----
  {
    title: 'VibeCrafters Presents: Neon Nights Music Festival',
    description:
      'A curated evening of live music, immersive lighting, and gourmet food trucks — VibeCrafters signature event design at its best.',
    category: 'festival',
    banner: 'neon-nights-2026',
    venue: venueIds[1],
    startDt: inDays(14, 18),
    endDt: inDays(14, 23),
    agenda: [
      { time: '18:00', title: 'Gates Open', description: 'Welcome & check-in' },
      { time: '19:00', title: 'Opening Act', speaker: 'The Midnight Collective' },
      { time: '21:00', title: 'Headliner Set', speaker: 'Aurora Skies' },
    ],
    tags: ['music', 'festival', 'live'],
    tiers: [
      { name: 'Early Bird', price: 799, quantity: 100 },
      { name: 'General', price: 1299, quantity: 300 },
      { name: 'VIP', price: 2999, quantity: 50 },
    ],
  },
  {
    title: 'Street Food & Culture Festival',
    description:
      'A weekend-long celebration of regional street food, live folk and fusion performances, and craft stalls from local artisans — family-friendly and dog-friendly.',
    category: 'festival',
    banner: 'street-food-fest-2026',
    venue: venueIds[2],
    startDt: inDays(22, 12),
    endDt: inDays(23, 22),
    agenda: [
      { time: '12:00', title: 'Food Stalls Open' },
      { time: '16:00', title: 'Folk Fusion Performance' },
      { time: '19:00', title: 'Evening Live Band' },
    ],
    tags: ['food', 'culture', 'festival'],
    tiers: [
      { name: 'Single Day', price: 299, quantity: 500 },
      { name: 'Weekend Pass', price: 499, quantity: 200 },
    ],
  },
  {
    title: 'Diwali Lights Festival',
    description:
      'An evening of traditional lamp displays, fireworks, live classical and folk performances, and a night market featuring local sweets, crafts, and décor.',
    category: 'festival',
    banner: 'diwali-lights-2026',
    venue: venueIds[0],
    startDt: inDays(60, 17),
    endDt: inDays(60, 22),
    agenda: [
      { time: '17:00', title: 'Night Market Opens' },
      { time: '19:00', title: 'Lamp Lighting Ceremony' },
      { time: '20:00', title: 'Classical Dance Performance' },
      { time: '21:00', title: 'Fireworks Display' },
    ],
    tags: ['diwali', 'festival', 'culture'],
    tiers: [
      { name: 'General Entry', price: 199, quantity: 600 },
      { name: 'Family Pack (4)', price: 699, quantity: 150 },
    ],
  },

  // ---- workshop ----
  {
    title: 'Full-Stack Web Development Bootcamp',
    description:
      'A hands-on, one-day intensive covering modern React and Node.js fundamentals — build and deploy a real project by the end of the day, laptops provided if needed.',
    category: 'workshop',
    banner: 'webdev-bootcamp-2026',
    venue: venueIds[1],
    startDt: inDays(10, 9),
    endDt: inDays(10, 17),
    agenda: [
      { time: '09:00', title: 'Setup & Fundamentals Recap' },
      { time: '11:00', title: 'Building the Frontend' },
      { time: '14:00', title: 'Connecting the Backend' },
      { time: '16:00', title: 'Deploy & Wrap-up' },
    ],
    tags: ['workshop', 'coding', 'webdev'],
    tiers: [
      { name: 'Standard Seat', price: 1499, quantity: 40 },
      { name: 'Seat + Laptop Rental', price: 1999, quantity: 15 },
    ],
  },
  {
    title: 'Photography Masterclass Workshop',
    description:
      'Learn portrait and low-light photography from a working professional, with a live outdoor shoot and one-on-one editing feedback session included.',
    category: 'workshop',
    banner: 'photography-masterclass-2026',
    venue: venueIds[2],
    startDt: inDays(17, 10),
    endDt: inDays(17, 16),
    agenda: [
      { time: '10:00', title: 'Camera Fundamentals & Composition' },
      { time: '12:00', title: 'Live Outdoor Shoot' },
      { time: '14:30', title: 'Editing Feedback Session' },
    ],
    tags: ['photography', 'workshop', 'creative'],
    tiers: [
      { name: 'Standard', price: 1199, quantity: 30 },
      { name: 'Bring Your Own Model', price: 1599, quantity: 10 },
    ],
  },
  {
    title: 'Pottery & Ceramics Hands-On Workshop',
    description:
      'A relaxed, beginner-friendly afternoon at the wheel — take home your own hand-thrown piece after it\'s fired, no experience necessary.',
    category: 'workshop',
    banner: 'pottery-workshop-2026',
    venue: venueIds[0],
    startDt: inDays(9, 13),
    endDt: inDays(9, 17),
    agenda: [
      { time: '13:00', title: 'Introduction to the Wheel' },
      { time: '14:00', title: 'Hands-On Throwing Practice' },
      { time: '16:00', title: 'Glazing Options & Wrap-up' },
    ],
    tags: ['pottery', 'crafts', 'workshop'],
    tiers: [
      { name: 'Single Seat', price: 899, quantity: 20 },
      { name: 'Pair Seat', price: 1599, quantity: 10 },
    ],
  },

  // ---- other ----
  {
    title: 'Charity Gala for Children\'s Education',
    description:
      'An elegant evening of dinner, live auction, and performances raising funds for underprivileged children\'s education — 100% of ticket proceeds go directly to the cause.',
    category: 'other',
    banner: 'charity-gala-2026',
    venue: venueIds[1],
    startDt: inDays(35, 19),
    endDt: inDays(35, 23),
    agenda: [
      { time: '19:00', title: 'Cocktail Reception' },
      { time: '20:00', title: 'Dinner & Program' },
      { time: '21:00', title: 'Live Auction' },
    ],
    tags: ['charity', 'gala', 'fundraiser'],
    tiers: [
      { name: 'Individual Seat', price: 1999, quantity: 150 },
      { name: 'Table of 10', price: 17999, quantity: 15 },
    ],
  },
  {
    title: 'Contemporary Art Exhibition Opening',
    description:
      'The opening night of a curated contemporary art exhibition featuring emerging regional artists — includes a guided walkthrough with the curator and light refreshments.',
    category: 'other',
    banner: 'art-exhibition-2026',
    venue: venueIds[2],
    startDt: inDays(20, 18),
    endDt: inDays(20, 21),
    agenda: [
      { time: '18:00', title: 'Doors Open' },
      { time: '18:30', title: 'Curator-Led Walkthrough' },
      { time: '19:30', title: 'Open Viewing & Refreshments' },
    ],
    tags: ['art', 'exhibition', 'culture'],
    tiers: [
      { name: 'General Entry', price: 299, quantity: 150 },
      { name: 'Curator Walkthrough Pass', price: 599, quantity: 40 },
    ],
  },
  {
    title: 'Wine & Culinary Tasting Evening',
    description:
      'A guided tasting menu pairing regional wines with a five-course seasonal dinner, hosted by a sommelier and the venue\'s executive chef.',
    category: 'other',
    banner: 'wine-tasting-2026',
    venue: venueIds[0],
    startDt: inDays(27, 19),
    endDt: inDays(27, 22),
    agenda: [
      { time: '19:00', title: 'Welcome Reception' },
      { time: '19:30', title: 'Five-Course Tasting Menu' },
      { time: '21:30', title: 'Sommelier Q&A' },
    ],
    tags: ['wine', 'culinary', 'tasting'],
    tiers: [
      { name: 'Standard Seat', price: 2499, quantity: 60 },
      { name: 'Sommelier\'s Table', price: 3999, quantity: 12 },
    ],
  },
];

const run = async () => {
  await connectDB();
  console.log('Seeding VibeCrafters EMS demo data...');

  await Promise.all([
    User.deleteMany({}),
    Venue.deleteMany({}),
    Vendor.deleteMany({}),
    Event.deleteMany({}),
    TicketType.deleteMany({}),
  ]);

  const admin = await User.create({
    name: 'VibeCrafters Admin',
    email: 'admin@vibecrafters.com',
    passwordHash: 'Admin@123',
    role: 'admin',
  });

  const organizer = await User.create({
    name: 'Pandya Meet',
    email: 'organizer@vibecrafters.com',
    passwordHash: 'Organizer@123',
    role: 'organizer',
  });

  await User.create({
    name: 'Demo Attendee',
    email: 'attendee@vibecrafters.com',
    passwordHash: 'Attendee@123',
    role: 'attendee',
  });

  const vendorUser = await User.create({
    name: 'Shah Raj Catering Co.',
    email: 'vendor@vibecrafters.com',
    passwordHash: 'Vendor@123',
    role: 'vendor',
  });

  const vendor = await Vendor.create({
    user: vendorUser._id,
    name: 'Shah Raj Catering Co.',
    serviceType: 'catering',
    contactEmail: vendorUser.email,
    contactPhone: '+91 90000 00000',
    approved: true,
  });

  const venues = await Venue.insertMany([
    {
      name: 'VibeCrafters Grand Pavilion',
      address: '221 Skyline Avenue',
      city: 'Ahmedabad',
      capacity: 500,
      amenities: ['Parking', 'AV System', 'Catering Kitchen', 'Wheelchair Access'],
      vendor: vendor._id,
    },
    {
      name: 'The Convention Hub',
      address: '48 MG Road',
      city: 'Bengaluru',
      capacity: 800,
      amenities: ['Parking', 'AV System', 'Breakout Rooms', 'High-Speed WiFi'],
    },
    {
      name: 'Riverside Garden Courtyard',
      address: '7 Riverfront Lane',
      city: 'Pune',
      capacity: 350,
      amenities: ['Outdoor Seating', 'String Lighting', 'Catering Kitchen', 'Parking'],
    },
  ]);
  const venueIds = venues.map((v) => v._id);

  const eventDefs = buildEvents(organizer._id, venueIds, vendor._id);

  for (const def of eventDefs) {
    const event = await Event.create({
      title: def.title,
      description: def.description,
      category: def.category,
      bannerUrl: `https://picsum.photos/seed/${def.banner}/1200/700`,
      organizer: organizer._id,
      venue: def.venue,
      vendors: [vendor._id],
      agenda: def.agenda,
      startDt: def.startDt,
      endDt: def.endDt,
      status: 'published',
      tags: def.tags,
    });

    await TicketType.insertMany(def.tiers.map((t) => ({ ...t, event: event._id })));
  }

  console.log(`✅ Seeded ${eventDefs.length} events across 7 categories (3 each).`);
  console.log('✅ Demo logins:');
  console.log('   Admin:     admin@vibecrafters.com / Admin@123');
  console.log('   Organizer: organizer@vibecrafters.com / Organizer@123');
  console.log('   Vendor:    vendor@vibecrafters.com / Vendor@123');
  console.log('   Attendee:  attendee@vibecrafters.com / Attendee@123');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
