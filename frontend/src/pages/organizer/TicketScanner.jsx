import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, ScanLine, CheckCircle2, XCircle, KeyRound, CameraOff, Download, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { downloadCheckInReport } from '../../utils/downloadCheckInReport';

const SCANNER_ELEMENT_ID = 'ticket-scanner-viewport';
// Ignore repeat reads of the same QR code within this window — the camera feeds ~10
// frames/sec, so without this a single held-up ticket would fire the check-in request
// (and the success/error flash) dozens of times before the attendee even lowers it.
const RESCAN_LOCK_MS = 3000;

// Module-level (not per-instance) lock so that rapid mount/unmount cycles — e.g. the
// organizer navigates away then hits browser Back before the camera finished stopping —
// can never let a new Html5Qrcode instance call start() on the shared DOM element while
// the previous instance's stop()/clear() is still in flight. Without this, that race
// could throw during teardown/setup and, with no error boundary catching it, blank the
// whole page. Chaining every start/stop through one promise guarantees strict ordering.
let scannerLock = Promise.resolve();

/**
 * Extracts a check-in identifier from whatever the camera decoded. Tickets are
 * generated as JSON via utils/qrGenerator.js -> { t: ticketId, e: eventId, c: code }.
 * We fall back to treating the raw string as a `code` so a manually typed/pasted
 * ticket code (or a plain-text QR from an older ticket) still works.
 */
const parseScannedValue = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.t) {
      return { ticketId: parsed.t };
    }
  } catch {
    // not JSON — fall through to treating it as a raw code
  }
  return { code: raw.trim() };
};

export default function TicketScanner() {
  const { t } = useTranslation();
  const scannerRef = useRef(null);
  const lastScanRef = useRef({ value: null, at: 0 });

  const [myEvents, setMyEvents] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [checking, setChecking] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null); // { ok, message, ticket }
  const [checkedInList, setCheckedInList] = useState([]); // successful scans this session
  const [exporting, setExporting] = useState(false);

  const selectedEvent = myEvents?.find((e) => e._id === selectedEventId) || null;

  // Load the organizer's own events so they can pick which one they're working the door
  // for — needed so the "export as PDF" button knows which event's report to fetch.
  useEffect(() => {
    api.get('/events?mine=true&limit=100').then(({ data }) => {
      setMyEvents(data.events);
      if (data.events.length === 1) setSelectedEventId(data.events[0]._id);
    });
  }, []);

  const submitCheckIn = useCallback(async (payload) => {
    setChecking(true);
    try {
      const { data } = await api.post('/tickets/check-in', payload);
      setResult({ ok: true, message: data.message, ticket: data.ticket, at: new Date() });
      setCheckedInList((prev) => [
        {
          name: data.ticket.user?.name || t('ticketScanner.unknownName'),
          email: data.ticket.user?.email,
          tier: data.ticket.ticketType?.name,
          eventTitle: data.ticket.event?.title,
          eventId: data.ticket.event?._id,
          at: new Date(),
        },
        ...prev,
      ]);
      if (navigator.vibrate) navigator.vibrate(80);
    } catch (err) {
      setResult({ ok: false, message: err.message, at: new Date() });
      if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
    } finally {
      setChecking(false);
    }
  }, []);

  const handleDecoded = useCallback(
    (decodedText) => {
      const now = Date.now();
      if (lastScanRef.current.value === decodedText && now - lastScanRef.current.at < RESCAN_LOCK_MS) {
        return; // same code scanned again too soon — ignore
      }
      lastScanRef.current = { value: decodedText, at: now };
      submitCheckIn(parseScannedValue(decodedText));
    },
    [submitCheckIn]
  );

  // Start the camera scanner on mount, stop it cleanly on unmount. html5-qrcode owns
  // the <video>/<canvas> it injects into SCANNER_ELEMENT_ID, so we never touch the DOM
  // ourselves — just start/stop the instance. Both are chained through the module-level
  // `scannerLock` so a fast unmount-then-remount (browser back/forward) can't overlap
  // a new start() with the previous instance's still-pending stop()/clear().
  useEffect(() => {
    let isMounted = true;
    let html5Qrcode = null;

    scannerLock = scannerLock.then(async () => {
      if (!isMounted) return; // navigated away again before this mount's turn came up

      html5Qrcode = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = html5Qrcode;

      try {
        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          handleDecoded,
          () => {} // per-frame "no QR found" callback — expected constantly, ignore
        );
        if (isMounted) setCameraActive(true);
      } catch (err) {
        if (isMounted) {
          setCameraError(
            err?.message?.includes('NotAllowedError') || String(err).includes('Permission')
              ? t('ticketScanner.cameraPermissionDenied')
              : t('ticketScanner.cameraStartError')
          );
        }
      }
    });

    return () => {
      isMounted = false;
      scannerLock = scannerLock.then(async () => {
        if (!html5Qrcode) return; // this mount's start() never actually ran
        try {
          if (html5Qrcode.isScanning) await html5Qrcode.stop();
        } catch {
          // camera may already be stopped/released — safe to ignore
        }
        try {
          html5Qrcode.clear();
        } catch {
          // DOM node may already be gone if React unmounted the page first — safe to ignore
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    submitCheckIn(parseScannedValue(manualCode));
    setManualCode('');
  };

  const handleExport = async () => {
    if (!selectedEvent) return;
    setExporting(true);
    try {
      await downloadCheckInReport(selectedEvent._id, selectedEvent.slug || selectedEvent.title);
    } catch (err) {
      toast.error(err.message || t('ticketScanner.reportError'));
    } finally {
      setExporting(false);
    }
  };

  // Only list scans that match the event currently selected — if the organizer scans a
  // ticket for a different event by mistake, it still checks in (the backend doesn't
  // require a matching eventId), but it won't clutter this event's list.
  const visibleCheckIns = selectedEvent ? checkedInList.filter((c) => c.eventId === selectedEvent._id) : checkedInList;

  const mismatchedEvent =
    result?.ok && selectedEvent && result.ticket?.event?._id && result.ticket.event._id !== selectedEvent._id
      ? result.ticket.event?.title
      : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/organizer" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink">
        <ArrowLeft size={15} /> {t('ticketScanner.backToDashboard')}
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vibe-gradient-soft text-magenta">
          <ScanLine size={19} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{t('ticketScanner.title')}</h1>
          <p className="text-sm text-ink/60">{t('ticketScanner.subtitle')}</p>
        </div>
      </div>

      {/* Event picker — determines which event's report the export button generates */}
      <div className="mt-6 card p-4">
        {myEvents === null ? (
          <LoadingSpinner />
        ) : myEvents.length === 0 ? (
          <p className="text-sm text-ink/60">{t('ticketScanner.noEventsYet')}</p>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink/70">{t('ticketScanner.workingDoorFor')}</span>
            <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="input !py-2">
              <option value="">{t('ticketScanner.selectEventPlaceholder')}</option>
              {myEvents.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-4 card overflow-hidden p-0">
        <div className="relative aspect-square w-full bg-ink sm:aspect-video">
          <div id={SCANNER_ELEMENT_ID} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

          {!cameraActive && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
              <ScanLine size={28} className="animate-pulse" />
              <p className="text-sm">{t('ticketScanner.startingCamera')}</p>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/95 px-8 text-center text-white/80">
              <CameraOff size={26} />
              <p className="text-sm">{cameraError}</p>
            </div>
          )}

          {checking && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
            </div>
          )}
        </div>

        {/* Manual fallback — always available, e.g. no camera, printed ticket is smudged, or attendee shows the code on a second device */}
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2 border-t border-ink/8 p-4">
          <KeyRound size={16} className="shrink-0 text-ink/40" />
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={t('ticketScanner.manualCodePlaceholder')}
            className="input flex-1 !py-2 text-sm"
          />
          <button type="submit" disabled={checking || !manualCode.trim()} className="btn-secondary !px-4 !py-2 text-sm">
            {t('ticketScanner.checkIn')}
          </button>
        </form>
      </div>

      {/* Latest result — the big, glanceable state an organizer checks after every scan */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.at.getTime()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`mt-6 flex items-start gap-3 rounded-xl2 border p-4 ${
              result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {result.ok ? <CheckCircle2 size={20} className="mt-0.5 shrink-0" /> : <XCircle size={20} className="mt-0.5 shrink-0" />}
            <div>
              <p className="font-medium">{result.message}</p>
              {result.ok && result.ticket && (
                <p className="mt-0.5 text-sm opacity-80">
                  {result.ticket.user?.name && <>{result.ticket.user.name} · </>}
                  {result.ticket.ticketType?.name}
                  {result.ticket.event?.title && <> · {result.ticket.event.title}</>}
                </p>
              )}
              {mismatchedEvent && (
                <p className="mt-1 text-xs font-medium opacity-80">
                  {t('ticketScanner.mismatchNote', { title: mismatchedEvent })}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live checked-in list for the selected event, with a one-click branded PDF export */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink/60">
            <Users size={15} /> {t('ticketScanner.checkedInHeading')} {selectedEvent ? `— ${selectedEvent.title}` : t('ticketScanner.thisSession')} ({visibleCheckIns.length})
          </h2>
          <button
            onClick={handleExport}
            disabled={!selectedEvent || exporting}
            className="btn-secondary !px-3 !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            title={!selectedEvent ? t('ticketScanner.exportTitleSelect') : t('ticketScanner.exportTitleDownload')}
          >
            <Download size={13} /> {exporting ? t('ticketScanner.preparing') : t('ticketScanner.exportAsPdf')}
          </button>
        </div>

        {visibleCheckIns.length === 0 ? (
          <div className="mt-3 rounded-xl2 border border-dashed border-ink/15 p-6 text-center text-sm text-ink/50">
            {selectedEvent ? t('ticketScanner.noOneCheckedInFor', { title: selectedEvent.title }) : t('ticketScanner.noOneCheckedInGeneric')}
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-ink/6 overflow-hidden rounded-xl2 border border-ink/8 bg-white">
            {visibleCheckIns.map((c, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{c.name}</p>
                  {c.email && <p className="truncate text-xs text-ink/50">{c.email}</p>}
                </div>
                {c.tier && <span className="pill shrink-0 bg-ink/5 text-ink/60">{c.tier}</span>}
                <span className="shrink-0 text-xs text-ink/40">{c.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-ink/40">
          {t('ticketScanner.exportNote')}
        </p>
      </div>
    </div>
  );
}
