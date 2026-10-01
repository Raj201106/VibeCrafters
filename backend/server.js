require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const passport = require('./config/passport');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { registerChatSocket } = require('./sockets/chatSocket');
const { startReminderCron } = require('./utils/reminderCron');
const { startPaymentCron } = require('./utils/paymentCron');
const sanitizeInput = require('./middleware/sanitizeInput');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const venueRoutes = require('./routes/venueRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const contactRoutes = require('./routes/contactRoutes');
const promoRoutes = require('./routes/promoRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

connectDB();

const app = express();
const server = http.createServer(app);

// Render/Railway/Heroku-style hosts sit behind a reverse proxy — trusting it lets Express see
// the original HTTPS scheme via X-Forwarded-Proto, which secure cookies depend on.
app.set('trust proxy', 1);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});
app.set('io', io); // accessible in controllers via req.app.get('io')

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(sanitizeInput);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', apiLimiter);

// Brute-force protection on the auth endpoints most worth targeting: login, registration,
// and password-reset requests get a much tighter limit than general API traffic.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'vibecrafters-ems-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/promotions', promoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

registerChatSocket(io);
startReminderCron();
startPaymentCron();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 VibeCrafters EMS API running on port ${PORT}`));
