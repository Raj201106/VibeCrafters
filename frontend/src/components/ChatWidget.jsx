import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';

/**
 * A floating chat button that expands into a panel for one specific conversation:
 * the logged-in user talking to `otherUser` about `eventId`. Authorization (must be the
 * event's organizer or a ticket-holder) is enforced server-side — this component just
 * renders whatever the server allows.
 */
export default function ChatWidget({ eventId, otherUser, eventTitle }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open || !otherUser?.id) return;
    setLoading(true);
    api
      .get(`/chat/${eventId}/${otherUser.id}`)
      .then(({ data }) => setMessages(data.messages))
      .catch((err) => toast.error(err.message || t('chat.loadError')))
      .finally(() => setLoading(false));

    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('chat:join', { eventId, otherUserId: otherUser.id });

    const onMessage = (msg) => {
      const isThisThread =
        String(msg.event) === String(eventId) &&
        (String(msg.sender._id) === String(otherUser.id) || String(msg.recipient) === String(otherUser.id));
      if (isThisThread) setMessages((prev) => [...prev, msg]);
    };
    const onError = (e) => toast.error(e.message);

    socket.on('chat:message', onMessage);
    socket.on('chat:error', onError);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:error', onError);
    };
  }, [open, eventId, otherUser?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    getSocket().emit('chat:message', { eventId, recipientId: otherUser.id, message: trimmed });
    setText('');
  };

  if (!otherUser?.id) return null;

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-vibe-gradient text-white shadow-glow"
        aria-label={t('chat.openChat')}
      >
        <MessageCircle size={22} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-24 right-6 z-40 flex h-[420px] w-[340px] flex-col overflow-hidden rounded-xl2 border border-ink/10 bg-white shadow-glow"
          >
            <div className="flex items-center justify-between bg-vibe-gradient px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{otherUser.name}</p>
                {eventTitle && <p className="truncate text-xs text-white/80">{eventTitle}</p>}
              </div>
              <button onClick={() => setOpen(false)} className="shrink-0 rounded-full p-1 hover:bg-white/20">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {loading ? (
                <p className="mt-8 text-center text-xs text-ink/40">{t('chat.loadingConversation')}</p>
              ) : messages.length === 0 ? (
                <p className="mt-8 text-center text-xs text-ink/40">{t('chat.noMessages')}</p>
              ) : (
                messages.map((m) => {
                  const mine = String(m.sender?._id || m.sender) === String(user?.id);
                  return (
                    <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          mine ? 'bg-vibe-gradient text-white' : 'bg-ink/5 text-ink'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="flex items-center gap-2 border-t border-ink/8 p-2">
              <input
                className="input flex-1 !py-2 text-sm"
                placeholder={t('chat.typePlaceholder')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={2000}
              />
              <button type="submit" className="rounded-full bg-vibe-gradient p-2.5 text-white">
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
