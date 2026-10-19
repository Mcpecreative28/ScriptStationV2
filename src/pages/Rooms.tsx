
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import { Link } from 'react-router-dom';

import {
  AlertTriangle,
  Check,
  LoaderCircle,
  LogIn,
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  X,
} from 'lucide-react';

import {
  getIdTokenResult,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

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


type Notice = {
  type: 'success' | 'error';
  message: string;
};


function messageTime(value?: RoomMessage['createdAt']) {
  if (!value) {
    return '';
  }

  const date =
    typeof value === 'string'
      ? new Date(value)
      : new Date((value._seconds || 0) * 1000);

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
}


export default function Rooms() {
  const [user, setUser] = useState<User | null>(
    auth?.currentUser || null,
  );

  const [isAdmin, setIsAdmin] = useState(false);

  const [messages, setMessages] = useState<RoomMessage[]>([]);

  const [text, setText] = useState('');

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [messageToDelete, setMessageToDelete] =
    useState<RoomMessage | null>(null);

  const [notice, setNotice] = useState<Notice | null>(null);

  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, async (current) => {
      setUser(current);

      setIsAdmin(false);

      if (!current) {
        return;
      }

      try {
        const token = await getIdTokenResult(current, true);

        setIsAdmin(token.claims.admin === true);
      } catch {
        setIsAdmin(false);
      }
    });
  }, []);


  const loadMessages = useCallback(async () => {
    try {
      setError('');

      const response = await fetch('/api/rooms-messages', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Gagal memuat pesan.',
        );
      }

      setMessages(
        Array.isArray(data.messages)
          ? data.messages
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat pesan.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);


  async function deleteMessage() {
    if (!user || !isAdmin || !messageToDelete || deleting) {
      return;
    }

    try {
      setDeleting(true);
      setError('');
      setNotice(null);

      const token = await user.getIdToken();

      const response = await fetch(
        `/api/rooms-messages?id=${encodeURIComponent(
          messageToDelete.id,
        )}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Pesan gagal dihapus.',
        );
      }

      setMessages((current) =>
        current.filter(
          (message) => message.id !== messageToDelete.id,
        ),
      );

      setMessageToDelete(null);

      setNotice({
        type: 'success',
        message: 'Pesan berhasil dihapus.',
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Pesan gagal dihapus.',
      );
    } finally {
      setDeleting(false);
    }
  }


  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = text.trim();

    if (!value || !user || sending) {
      return;
    }

    try {
      setSending(true);
      setError('');
      setNotice(null);

      const token = await user.getIdToken();

      const response = await fetch('/api/rooms-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Pesan gagal dikirim.',
        );
      }

      setText('');

      await loadMessages();

      inputRef.current?.focus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Pesan gagal dikirim.',
      );
    } finally {
      setSending(false);
    }
  }


  async function refreshMessages() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    await loadMessages();
  }


  return (
    <Shell>
      <main
        className="
          mx-auto
          max-w-5xl
          px-4
          pb-16
          pt-28
          sm:px-6
        "
      >
        <section className="mb-6">
          <div
            className="
              mb-3
              flex
              items-center
              gap-2
              text-cyan-300
            "
          >
            <MessageCircle size={18} />

            <span
              className="
                text-xs
                uppercase
                tracking-[.22em]
              "
            >
              Community
            </span>
          </div>

          <h1 className="text-3xl font-semibold sm:text-4xl">
            Global Chat
          </h1>

          <p
            className="
              mt-3
              max-w-2xl
              text-sm
              leading-6
              text-zinc-400
            "
          >
            Diskusi publik untuk berbagi ide, bertanya,
            dan membantu developer lain. Login diperlukan
            untuk mengirim pesan.
          </p>
        </section>


        <section
          className="
            glass
            overflow-hidden
            rounded-3xl
            border
            border-white/10
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              border-b
              border-white/10
              px-4
              py-4
              sm:px-6
            "
          >
            <div>
              <h2 className="font-semibold">
                Public Room
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Jaga percakapan tetap sopan dan relevan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void refreshMessages()}
              disabled={refreshing}
              className="
                inline-flex
                shrink-0
                items-center
                gap-2
                rounded-xl
                border
                border-white/10
                bg-white/[0.03]
                px-3
                py-2
                text-xs
                text-zinc-300
                transition
                hover:bg-white/[0.07]
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={14}
                className={
                  refreshing ? 'animate-spin' : ''
                }
              />

              Refresh
            </button>
          </div>


          <div
            className="
              flex
              min-h-[360px]
              flex-col
              gap-4
              p-4
              sm:p-6
            "
          >
            {loading ? (
              <div
                className="
                  flex
                  flex-1
                  items-center
                  justify-center
                  gap-3
                  text-sm
                  text-zinc-500
                "
              >
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />

                Memuat pesan...
              </div>
            ) : messages.length === 0 ? (
              <div className="m-auto text-center">
                <MessageCircle
                  className="mx-auto text-zinc-600"
                  size={30}
                />

                <p className="mt-3 text-sm text-zinc-400">
                  Belum ada pesan. Mulai percakapan pertama.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className="flex gap-3"
                >
                  {message.photoURL ? (
                    <img
                      src={message.photoURL}
                      alt=""
                      className="
                        h-9
                        w-9
                        shrink-0
                        rounded-full
                        object-cover
                      "
                    />
                  ) : (
                    <div
                      className="
                        grid
                        h-9
                        w-9
                        shrink-0
                        place-items-center
                        rounded-full
                        border
                        border-white/10
                        bg-white/[0.06]
                        text-xs
                      "
                    >
                      {message.displayName
                        ?.slice(0, 1)
                        .toUpperCase() || 'U'}
                    </div>
                  )}

                  <div
                    className="
                      min-w-0
                      flex-1
                      rounded-2xl
                      border
                      border-white/[0.08]
                      bg-white/[0.03]
                      px-4
                      py-3
                    "
                  >
                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-x-3
                        gap-y-1
                      "
                    >
                      <span className="text-sm font-medium">
                        {message.displayName || 'Developer'}
                      </span>

                      <span className="text-[11px] text-zinc-600">
                        {messageTime(message.createdAt)}
                      </span>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            setMessageToDelete(message)
                          }
                          aria-label="Hapus pesan"
                          title="Hapus pesan"
                          className="
                            ml-auto
                            rounded-lg
                            border
                            border-transparent
                            p-1.5
                            text-rose-300
                            transition
                            hover:border-rose-400/20
                            hover:bg-rose-400/10
                          "
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <p
                      className="
                        mt-2
                        whitespace-pre-wrap
                        break-words
                        text-sm
                        leading-6
                        text-zinc-300
                      "
                    >
                      {message.text}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>


          {error && (
            <div
              role="alert"
              className="
                mx-4
                mb-3
                flex
                items-start
                gap-2
                rounded-xl
                border
                border-rose-400/20
                bg-rose-400/[0.06]
                p-3
                text-sm
                text-rose-300
                sm:mx-6
              "
            >
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <p className="min-w-0 flex-1">
                {error}
              </p>

              <button
                type="button"
                aria-label="Tutup pesan error"
                onClick={() => setError('')}
                className="shrink-0 text-rose-200/70 hover:text-rose-100"
              >
                <X size={16} />
              </button>
            </div>
          )}


          {notice && (
            <div
              role="status"
              className="
                mx-4
                mb-3
                flex
                items-start
                gap-2
                rounded-xl
                border
                border-emerald-400/20
                bg-emerald-400/[0.06]
                p-3
                text-sm
                text-emerald-300
                sm:mx-6
              "
            >
              <Check
                size={17}
                className="mt-0.5 shrink-0"
              />

              <p className="min-w-0 flex-1">
                {notice.message}
              </p>

              <button
                type="button"
                aria-label="Tutup notifikasi"
                onClick={() => setNotice(null)}
                className="shrink-0 text-emerald-200/70 hover:text-emerald-100"
              >
                <X size={16} />
              </button>
            </div>
          )}


          {user ? (
            <form
              onSubmit={sendMessage}
              className="
                flex
                gap-2
                border-t
                border-white/10
                p-4
                sm:p-6
              "
            >
              <input
                ref={inputRef}
                value={text}
                onChange={(event) =>
                  setText(event.target.value)
                }
                maxLength={500}
                placeholder="Tulis pesan..."
                className="
                  min-w-0
                  flex-1
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  px-4
                  py-3
                  text-sm
                  text-zinc-100
                  outline-none
                  placeholder:text-zinc-600
                  focus:border-cyan-300/40
                  focus:ring-2
                  focus:ring-cyan-300/10
                "
              />

              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="
                  inline-flex
                  shrink-0
                  items-center
                  gap-2
                  rounded-2xl
                  bg-white
                  px-4
                  py-3
                  text-sm
                  font-semibold
                  text-black
                  transition
                  hover:bg-zinc-200
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {sending ? (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={16} />
                )}

                <span className="hidden sm:inline">
                  {sending ? 'Mengirim...' : 'Kirim'}
                </span>
              </button>
            </form>
          ) : (
            <div
              className="
                border-t
                border-white/10
                p-5
                text-center
              "
            >
              <p className="mb-3 text-sm text-zinc-400">
                Login untuk mengirim pesan ke Global Chat.
              </p>

              <Link
                to="/login"
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-black
                  transition
                  hover:bg-zinc-200
                "
              >
                <LogIn size={16} />

                Login
              </Link>
            </div>
          )}
        </section>
      </main>


      {messageToDelete && (
        <div
          className="
            fixed
            inset-0
            z-[200]
            flex
            items-center
            justify-center
            overflow-y-auto
            bg-black/70
            px-4
            py-8
            backdrop-blur-md
          "
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleting
            ) {
              setMessageToDelete(null);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-message-title"
            aria-describedby="delete-message-description"
            className="
              relative
              w-full
              max-w-md
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-[#101014]/95
              p-5
              shadow-2xl
              shadow-black/50
              backdrop-blur-2xl
              sm:p-6
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                inset-x-8
                top-0
                h-px
                bg-gradient-to-r
                from-transparent
                via-rose-400/60
                to-transparent
              "
            />

            <button
              type="button"
              aria-label="Tutup dialog"
              disabled={deleting}
              onClick={() => setMessageToDelete(null)}
              className="
                absolute
                right-4
                top-4
                rounded-lg
                p-2
                text-zinc-500
                transition
                hover:bg-white/[0.06]
                hover:text-white
                disabled:opacity-40
              "
            >
              <X size={18} />
            </button>

            <div
              className="
                mb-5
                flex
                size-12
                items-center
                justify-center
                rounded-2xl
                border
                border-rose-400/20
                bg-rose-400/10
                text-rose-300
              "
            >
              <AlertTriangle size={23} />
            </div>

            <h2
              id="delete-message-title"
              className="
                pr-8
                text-xl
                font-semibold
                tracking-tight
                text-white
              "
            >
              Hapus pesan?
            </h2>

            <p
              id="delete-message-description"
              className="
                mt-3
                text-sm
                leading-6
                text-zinc-400
              "
            >
              Pesan dari{' '}
              <span className="font-medium text-zinc-200">
                {messageToDelete.displayName || 'Developer'}
              </span>{' '}
              akan dihapus dari Public Room. Tindakan ini
              tidak dapat dibatalkan.
            </p>

            <div
              className="
                mt-7
                flex
                flex-col-reverse
                gap-3
                sm:flex-row
                sm:justify-end
              "
            >
              <button
                type="button"
                disabled={deleting}
                onClick={() => setMessageToDelete(null)}
                className="
                  inline-flex
                  min-h-11
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/10
                  bg-white/[0.035]
                  px-5
                  py-2.5
                  text-sm
                  font-medium
                  text-zinc-300
                  transition
                  hover:bg-white/[0.08]
                  hover:text-white
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Batal
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => void deleteMessage()}
                className="
                  inline-flex
                  min-h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-rose-300/20
                  bg-rose-500
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-lg
                  shadow-rose-950/20
                  transition
                  hover:bg-rose-400
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {deleting && (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                )}

                {deleting ? 'Menghapus...' : 'Hapus pesan'}
              </button>
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}