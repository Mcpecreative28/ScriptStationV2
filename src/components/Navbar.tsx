import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Code2,
  Home,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Store,
  Terminal,
  UserRound,
  X,
  MessageCircle,
} from 'lucide-react';
import { getIdTokenResult, onAuthStateChanged, signOut, type User } from 'firebase/auth';

import { auth } from '../lib/firebase';

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
};

const mainNav: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Scripts', href: '/scripts', icon: Code2 },
  { label: 'Snippets', href: '/snippets', icon: Terminal },
  { label: 'Baileys', href: '/baileys', icon: BookOpen },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Rooms', href: '/rooms', icon: MessageCircle },
  { label: 'Marketplace', href: '/marketplace', icon: Store },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAdmin(false);

      if (!currentUser) return;

      try {
        const token = await getIdTokenResult(currentUser, true);
        setIsAdmin(token.claims.admin === true);
      } catch (error) {
        console.error('NAVBAR_CLAIM_ERROR:', error);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  async function handleLogout() {
    if (!auth) return;

    try {
      setLoggingOut(true);
      await signOut(auth);
      setMenuOpen(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('NAVBAR_LOGOUT_ERROR:', error);
      setLoggingOut(false);
    }
  }

  const displayName =
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Account';

  const photoURL = user?.photoURL || '';

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[24px] border border-white/10 bg-[#111114]/75 px-3 py-3 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:px-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
            aria-label="ScriptStationV2 home"
          >
            <img
              src="/scriptstation-v2.svg"
              alt="ScriptStationV2"
              className="h-11 w-11 shrink-0 rounded-2xl"
            />

            <span className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              ScriptStation<span className="text-zinc-500">V2</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                    active
                      ? 'bg-white text-black'
                      : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <UserRound size={15} />
                  )}
                  <span className="max-w-28 truncate">{displayName}</span>
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/15 bg-indigo-400/5 px-3 py-2 text-xs text-indigo-200 transition hover:bg-indigo-400/10"
                  >
                    <ShieldCheck size={15} />
                    Admin
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/8 px-3 py-2 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  <LogOut size={15} />
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200"
              >
                <LogIn size={15} />
                Login
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-zinc-300 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            {menuOpen ? <X size={25} /> : <Menu size={25} />}
          </button>
        </div>

        {menuOpen && (
          <div className="mx-auto mt-3 max-w-7xl overflow-hidden rounded-[28px] border border-white/10 bg-[#111114]/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-3xl lg:hidden">
            <div className="max-h-[calc(100vh-110px)] overflow-y-auto">
              <nav className="grid gap-1">
                {mainNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(location.pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3.5 transition ${
                        active
                          ? 'bg-white text-black'
                          : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={18} />
                        {item.label}
                      </span>

                      <ChevronRight size={16} className="opacity-40" />
                    </Link>
                  );
                })}
              </nav>

              <div className="my-2 border-t border-white/8" />

              {user ? (
                <div className="grid gap-1">
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-zinc-300 transition hover:bg-white/5 hover:text-white"
                  >
                    {photoURL ? (
                      <img
                        src={photoURL}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <UserRound size={18} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{displayName}</span>
                      <span className="block truncate text-xs text-zinc-600">
                        Dashboard
                      </span>
                    </span>
                    <ChevronRight size={16} className="opacity-40" />
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-indigo-200 transition hover:bg-indigo-400/5"
                    >
                      <ShieldCheck size={18} />
                      <span className="flex-1">Admin Panel</span>
                      <ChevronRight size={16} className="opacity-40" />
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                  >
                    <LogOut size={18} />
                    {loggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 font-semibold text-black transition hover:bg-zinc-200"
                >
                  <LogIn size={18} />
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
