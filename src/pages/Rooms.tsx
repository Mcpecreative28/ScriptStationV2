import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, RefreshCw, LogIn, Trash2 } from 'lucide-react';
import { getIdTokenResult, onAuthStateChanged, type User } from 'firebase/auth';
import Shell from '../components/Shell';
import { auth } from '../lib/firebase';

type RoomMessage = {
  id: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  text: string;
  createdAt?: string | { _seconds?: number };
};

function messageTime(value?: RoomMessage['createdAt']) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : new Date((value._seconds || 0) * 1000);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Rooms() {
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (current) => {
      setUser(current);
      setIsAdmin(false);
      if (current) {
        try {
          const token = await getIdTokenResult(current, true);
          setIsAdmin(token.claims.admin === true);
        } catch {
          setIsAdmin(false);
        }
      }
    });
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/rooms-messages');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat pesan.');
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  async function deleteMessage(id: string) {
    if (!user || !isAdmin || !window.confirm('Hapus pesan ini?')) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/rooms-messages?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pesan gagal dihapus.');
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pesan gagal dihapus.');
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || !user || sending) return;
    try {
      setSending(true);
      setError('');
      const token = await user.getIdToken();
      const response = await fetch('/api/rooms-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: value })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pesan gagal dikirim.');
      setText('');
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pesan gagal dikirim.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6">
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-cyan-300"><MessageCircle size={18} /><span className="text-xs uppercase tracking-[.22em]">Community</span></div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Global Chat</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Diskusi publik untuk berbagi ide, bertanya, dan membantu developer lain. Login diperlukan untuk mengirim pesan.</p>
        </section>
        <section className="glass overflow-hidden rounded-3xl border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
            <div><h2 className="font-semibold">Public Room</h2><p className="mt-1 text-xs text-zinc-500">Jaga percakapan tetap sopan dan relevan.</p></div>
            <button onClick={() => void loadMessages()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"><RefreshCw size={14} /> Refresh</button>
          </div>
          <div className="flex min-h-[360px] flex-col gap-4 p-4 sm:p-6">
            {loading ? <p className="text-sm text-zinc-500">Memuat pesan...</p> : messages.length === 0 ? <div className="m-auto text-center"><MessageCircle className="mx-auto text-zinc-600" size={30} /><p className="mt-3 text-sm text-zinc-400">Belum ada pesan. Mulai percakapan pertama.</p></div> : messages.map((message) => (
              <article key={message.id} className="flex gap-3">
                {message.photoURL ? <img src={message.photoURL} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs">{message.displayName?.slice(0, 1).toUpperCase() || 'U'}</div>}
                <div className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-white/[.03] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-sm font-medium">{message.displayName || 'Developer'}</span><span className="text-[11px] text-zinc-600">{messageTime(message.createdAt)}</span>{isAdmin && <button type="button" onClick={() => void deleteMessage(message.id)} aria-label="Hapus pesan" className="ml-auto rounded-lg p-1.5 text-red-300 hover:bg-red-400/10"><Trash2 size={14} /></button>}</div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{message.text}</p>
                </div>
              </article>
            ))}
          </div>
          {error && <p role="alert" className="mx-4 mb-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300 sm:mx-6">{error}</p>}
          {user ? <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-4 sm:p-6"><input value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder="Tulis pesan..." className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-cyan-300/40" /><button disabled={sending || !text.trim()} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"><Send size={16} /> <span className="hidden sm:inline">{sending ? 'Mengirim...' : 'Kirim'}</span></button></form> : <div className="border-t border-white/10 p-5 text-center"><p className="mb-3 text-sm text-zinc-400">Login untuk mengirim pesan ke Global Chat.</p><Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black"><LogIn size={16} /> Login</Link></div>}
        </section>
      </main>
    </Shell>
  );
}
