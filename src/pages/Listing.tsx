import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import type { Resource } from '../data/mock';
import { resources } from '../data/mock';
import ResourceCard from '../components/ResourceCard';
import Shell from '../components/Shell';
export default function Listing({kind}:{kind?:Resource['kind']}){const list=kind?resources.filter(x=>x.kind===kind):resources;return <Shell><main className="mx-auto max-w-7xl px-4 pb-12 pt-32 sm:px-6"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs uppercase tracking-[.2em] text-zinc-600">Resource hub</p><h1 className="mt-2 text-4xl font-semibold">{kind??'All resources'}</h1><p className="mt-2 text-zinc-500">Discover, preview and share developer resources.</p></div><Link to="/scripts/upload" className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black"><Upload size={16}/> Upload</Link></div><div className="mt-8 flex gap-2 overflow-x-auto scrollbar pb-2">{['Latest','Popular','Top Rated','Most Downloaded','A-Z'].map(x=><button key={x} className="whitespace-nowrap rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-xs text-zinc-400 hover:text-white">{x}</button>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map(r=><ResourceCard key={r.id} r={r}/>)}</div></main></Shell>}
