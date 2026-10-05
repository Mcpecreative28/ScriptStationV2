import type { ReactNode } from 'react';
import Navbar from './Navbar';

export default function Shell({ children }: { children: ReactNode }) {
  return <div className="noise min-h-screen overflow-hidden bg-[#07070a] text-zinc-100"><div className="grid-bg fixed inset-0 -z-20"/><div className="orb left-[8%] top-20 h-72 w-72 bg-indigo-500 -z-10"/><div className="orb right-[8%] top-[35%] h-80 w-80 bg-cyan-400 -z-10"/><Navbar/>{children}<footer className="mx-auto mt-20 max-w-7xl border-t border-white/7 px-4 py-8 text-sm text-zinc-600 sm:px-6"><div className="flex flex-col justify-between gap-3 sm:flex-row"><span>ScriptStationV2 · Public Developer Resource Hub</span><span>Built with React · Firebase-ready</span></div></footer></div>;
}
