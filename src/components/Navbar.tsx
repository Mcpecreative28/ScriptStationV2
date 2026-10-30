import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Code2,
  Download,
  Home,
  LogIn,
  LogOut,
  Menu,
  Search,
  ScanSearch,
  ShieldCheck,
  Store,
  Terminal,
  UserRound,
  X,
  MessageCircle,
  Tv,
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
  { label: 'AMFinder', href: '/amfinder', icon: ScanSearch },
  { label: 'Downloader', href: '/downloader', icon: Download },
  { label: 'AnimeHub', href: '/anime', icon: Tv },
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

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Account';
  const photoURL = user?.photoURL || '';

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-2.5 pt-2.5 sm:px-4 sm:pt-4">
        <div className="mx-auto flex w-full max-w-[1500px] items-center gap-2 rounded-2xl border border-white/[0.11] bg-[#101014]/90 p-2 shadow-2xl shadow-black/25 backdrop-blur-2xl sm:gap-3 sm:rounded-[22px] sm:px-3 sm:py-2.5">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5" aria-label="ScriptStationV2 home">
            <img src="/scriptstation-v2.svg" alt="ScriptStationV2" className="h-9 w-9 shrink-0 rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl" />
            <span className="hidden whitespace-nowrap text-base font-bold tracking-tight text-white sm:inline sm:text-lg">
              ScriptStation<span className="text-zinc-500">V2</span>
            </span>
            <span className="text-sm font-bold tracking-tight text-white sm:hidden">ScriptStation<span className="text-violet-300">V2</span></span>
          </Link>

          <nav className="ml-auto hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={item.label}
                  className={`inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-[11px] font-medium transition 2xl:px-3 2xl:text-xs ${
                    active ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto hidden shrink-0 items-center gap-1.5 xl:flex">
            {user ? (
              <>
                <Link to="/dashboard" title="Dashboard" className="inline-flex max-w-36 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 text-xs text-zinc-300 transition hover:bg-white/[0.08]">
                  {photoURL ? <img src={photoURL} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" /> : <UserRound size={15} />}
                  <span className="truncate">{displayName}</span>
                </Link>
                {isAdmin && <Link to="/admin" title="Admin Panel" className="grid h-9 w-9 place-items-center rounded-xl border border-indigo-300/15 bg-indigo-400/[0.07] text-indigo-200 transition hover:bg-indigo-400/15"><ShieldCheck size={16} /></Link>}
                <button type="button" onClick={handleLogout} disabled={loggingOut} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50">
                  <LogOut size={14} />{loggingOut ? 'Keluar...' : 'Logout'}
                </button>
              </>
            ) : (
              <Link to="/login" className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-black transition hover:bg-zinc-200">
                <LogIn size={14} /> Login
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={menuOpen}
            className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-zinc-200 transition hover:bg-white/[0.09] xl:hidden"
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {menuOpen && (
          <div className="mx-auto mt-2.5 w-full max-w-[1500px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#101014]/[0.97] p-3 shadow-2xl shadow-black/50 backdrop-blur-3xl sm:rounded-[24px] sm:p-4 xl:hidden">
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-bold text-white">Navigasi</p>
                <p className="mt-0.5 text-[11px] text-white/40">Pilih halaman ScriptStation</p>
              </div>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/40">MENU</span>
            </div>

            <nav className="grid max-h-[min(54vh,460px)] grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-0.5 sm:grid-cols-3">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(location.pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex min-h-[58px] min-w-0 items-center gap-2.5 rounded-xl border px-3 py-3 transition sm:min-h-[62px] ${
                      active
                        ? 'border-violet-300/25 bg-violet-300/[0.12] text-white'
                        : 'border-white/[0.06] bg-white/[0.025] text-zinc-300 hover:border-white/[0.12] hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? 'bg-violet-300/15 text-violet-200' : 'bg-white/[0.05] text-white/60'}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">{item.label}</span>
                    <ChevronRight size={14} className="shrink-0 opacity-35" />
                  </Link>
                );
              })}
            </nav>

            <div className="my-3 border-t border-white/[0.08]" />

            {user ? (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <Link to="/dashboard" className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3 transition hover:bg-white/[0.06]">
                  {photoURL ? <img src={photoURL} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06]"><UserRound size={17} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{displayName}</span>
                    <span className="block text-[11px] text-white/40">Dashboard akun</span>
                  </span>
                  <ChevronRight size={15} className="shrink-0 text-white/35" />
                </Link>
                {isAdmin && <Link to="/admin" className="flex items-center justify-center gap-2 rounded-xl border border-indigo-300/15 bg-indigo-400/[0.07] px-3 py-3 text-xs font-semibold text-indigo-200"><ShieldCheck size={16} /> Admin</Link>}
                <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-3 py-3 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50">
                  <LogOut size={15} />{loggingOut ? 'Keluar...' : 'Logout'}
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-zinc-200">
                <LogIn size={17} /> Login dengan Google
              </Link>
            )}
          </div>
        )}
      </header>
    </>
  );
}
