import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollProgress from './components/ScrollProgress';
import PageLoader from './components/PageLoader';
import ErrorBoundary from './components/ErrorBoundary';

// Route-level code splitting: each page ships as its own chunk instead of one large bundle.
// Home stays eagerly loaded since it's the most common entry point and should paint instantly;
// everything else — especially heavier pages like AdminDashboard (pulls in Recharts) — loads
// on demand. The branded PageLoader (already used for route-change transitions) doubles as the
// Suspense fallback, so a slow chunk fetch never shows a blank flash.
import Home from './pages/Home';
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Register = lazy(() => import('./pages/Register'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const Receipt = lazy(() => import('./pages/Receipt'));
const MyTickets = lazy(() => import('./pages/MyTickets'));
const Profile = lazy(() => import('./pages/Profile'));
const Gallery = lazy(() => import('./pages/Gallery'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));

const OrganizerDashboard = lazy(() => import('./pages/organizer/OrganizerDashboard'));
const CreateEvent = lazy(() => import('./pages/organizer/CreateEvent'));
const EditEvent = lazy(() => import('./pages/organizer/EditEvent'));
const AttendeesList = lazy(() => import('./pages/organizer/AttendeesList'));
const TicketScanner = lazy(() => import('./pages/organizer/TicketScanner'));
const VenueManager = lazy(() => import('./pages/organizer/VenueManager'));
const VendorPaymentSuccess = lazy(() => import('./pages/organizer/VendorPaymentSuccess'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const VendorDashboard = lazy(() => import('./pages/vendor/VendorDashboard'));

export default function App() {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const [booting, setBooting] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const isFirstRender = useRef(true);

  // Boot loader — shown once, slightly longer, on first paint of the whole app
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 1100);
    return () => clearTimeout(t);
  }, []);

  // Brief route loader — a short, delightful beat on every navigation after boot
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setRouteLoading(true);
    const t = setTimeout(() => setRouteLoading(false), 450);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? 'always' : 'never'}>
      <div className="flex min-h-screen flex-col bg-cream">
        <PageLoader visible={booting} variant="boot" />
        <PageLoader visible={!booting && routeLoading} variant="route" />
        <ScrollProgress />
        <Toaster
          position="top-center"
          toastOptions={{
            style: { borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
          }}
        />
        <Navbar />
        <main className="flex-1">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<PageLoader visible variant="route" />}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Routes location={location}>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/events/:slug" element={<EventDetails />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />

                    <Route
                      path="/receipt"
                      element={
                        <ProtectedRoute roles={['attendee', 'admin']}>
                          <Receipt />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-tickets"
                      element={
                        <ProtectedRoute roles={['attendee', 'admin']}>
                          <MyTickets />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/organizer"
                      element={
                        <ProtectedRoute roles={['organizer', 'admin']}>
                          <OrganizerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/organizer/create"
                      element={
                        <ProtectedRoute roles={['organizer', 'admin']}>
                          <CreateEvent />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/organizer/edit/:slug"
                      element={
                        <ProtectedRoute roles={['organizer', 'admin']}>
                          <EditEvent />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/organizer/events/:eventId/attendees"
                      element={
                        <ProtectedRoute roles={['organizer', 'admin']}>
                          <AttendeesList />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/organizer/vendor-payment-success"
                      element={
                        <ProtectedRoute roles={['organizer', 'admin']}>
                          <VendorPaymentSuccess />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/organizer/venues"
                      element={
                        <ProtectedRoute roles={['organizer', 'admin']}>
                          <VenueManager />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/organizer/scan"
                      element={
                        <ProtectedRoute roles={['organizer', 'admin']}>
                          <TicketScanner />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute roles={['admin']}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <ProtectedRoute roles={['admin']}>
                          <UserManagement />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/vendor"
                      element={
                        <ProtectedRoute roles={['vendor', 'admin']}>
                          <VendorDashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
