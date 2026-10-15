import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Search, Store, Plus, ExternalLink, Trash2, RefreshCw, LogIn } from 'lucide-react';
import { getIdTokenResult, onAuthStateChanged, type User } from 'firebase/auth';
import Shell from '../components/Shell';
import { auth } from '../lib/firebase';

type Product = { id: string; name: string; description: string; category: string; priceLabel: string; imageUrl?: string; url: string; createdAt?: string };
const emptyForm = { name: '', description: '', category: 'Tools', priceLabel: 'Free', imageUrl: '', url: '' };

export default function Marketplace() {
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (current) => {
      setUser(current);
      setIsAdmin(false);
      if (current) {
        try {
          const result = await getIdTokenResult(current, true);
          setIsAdmin(result.claims.admin === true);
        } catch {
          setIsAdmin(false);
        }
      }
    });
  }, []);

  async function loadProducts() {
    try {
      setError('');
      const response = await fetch('/api/marketplace-products');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat produk.');
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat produk.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProducts(); }, []);

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    if (!user || !isAdmin) return;
    try {
      setSaving(true);
      setError('');
      const token = await user.getIdToken();
      const response = await fetch('/api/marketplace-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Produk gagal disimpan.');
      setForm(emptyForm);
      setShowForm(false);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Produk gagal disimpan.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!user || !isAdmin || !window.confirm('Hapus produk ini?')) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/marketplace-products?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Produk gagal dihapus.');
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Produk gagal dihapus.');
    }
  }

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((item) => item.category).filter(Boolean)))], [products]);
  const visibleProducts = useMemo(() => products.filter((item) => (category === 'All' || item.category === category) && `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [products, category, search]);

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><div className="mb-3 flex items-center gap-2 text-indigo-300"><Store size={18} /><span className="text-xs uppercase tracking-[.22em]">Developer Store</span></div><h1 className="text-3xl font-semibold sm:text-4xl">Marketplace</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Temukan tools, resource, dan layanan developer yang dibagikan di ScriptStationV2.</p></div>
          {isAdmin && <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"><Plus size={17} /> Tambah Produk</button>}
        </section>
        <section className="mt-8 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] px-4"><Search size={17} className="text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk..." className="w-full bg-transparent py-3.5 text-sm outline-none" /></label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-white/10 bg-[#111114] px-4 py-3 text-sm text-zinc-300 outline-none">{categories.map((item) => <option key={item} value={item}>{item === 'All' ? 'Semua kategori' : item}</option>)}</select>
          <button onClick={() => void loadProducts()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"><RefreshCw size={15} /> Refresh</button>
        </section>
        {showForm && isAdmin && <form onSubmit={saveProduct} className="glass mt-5 grid gap-3 rounded-3xl p-5 sm:grid-cols-2 sm:p-6"><h2 className="sm:col-span-2 text-lg font-semibold">Tambah produk marketplace</h2><input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk" className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><input required maxLength={60} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategori" className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><input required maxLength={60} value={form.priceLabel} onChange={(e) => setForm({ ...form, priceLabel: e.target.value })} placeholder="Harga, contoh: Free / Rp 50.000" className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL produk" className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="URL gambar (opsional)" className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none sm:col-span-2" /><textarea required maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi produk" rows={3} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none sm:col-span-2" /><div className="flex gap-2 sm:col-span-2"><button disabled={saving} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan produk'}</button><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm">Batal</button></div></form>}
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</p>}
        {loading ? <div className="mt-8 text-sm text-zinc-500">Memuat marketplace...</div> : visibleProducts.length === 0 ? <div className="glass mt-8 rounded-3xl p-10 text-center"><Store size={30} className="mx-auto text-zinc-600" /><h2 className="mt-4 font-semibold">Belum ada produk</h2><p className="mt-2 text-sm text-zinc-500">{search ? 'Coba kata kunci lain.' : 'Produk yang dipublikasikan admin akan muncul di sini.'}</p>{!user && <Link to="/login" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm"><LogIn size={15} /> Login</Link>}</div> : <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleProducts.map((product) => <article key={product.id} className="glass overflow-hidden rounded-3xl border border-white/10"><div className="aspect-[16/9] bg-white/[.03]">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center"><Store size={34} className="text-zinc-700" /></div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><span className="rounded-full border border-indigo-300/15 bg-indigo-300/5 px-2.5 py-1 text-xs text-indigo-200">{product.category}</span><span className="text-sm font-semibold">{product.priceLabel}</span></div><h2 className="mt-4 text-lg font-semibold">{product.name}</h2><p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{product.description}</p><div className="mt-5 flex items-center gap-2">{product.url && <a href={product.url} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black">Lihat produk <ExternalLink size={15} /></a>}{isAdmin && <button onClick={() => void deleteProduct(product.id)} aria-label="Hapus produk" className="rounded-xl border border-red-400/20 p-2.5 text-red-300 hover:bg-red-400/5"><Trash2 size={16} /></button>}</div></div></article>)}</section>}
      </main>
    </Shell>
  );
}
