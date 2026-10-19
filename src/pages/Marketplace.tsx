
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { Link } from 'react-router-dom';

import {
  Search,
  Store,
  Plus,
  ExternalLink,
  Trash2,
  RefreshCw,
  LogIn,
  ImagePlus,
  LoaderCircle,
  X,
  Package,
  ChevronDown,
  Check,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';

import {
  getIdTokenResult,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

import Shell from '../components/Shell';
import { auth } from '../lib/firebase';

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  priceLabel: string;
  imageUrl?: string;
  url: string;
  createdAt?: string;
};

type ProductForm = {
  name: string;
  description: string;
  category: string;
  priceLabel: string;
  imageUrl: string;
  url: string;
};

type Notice = {
  type: 'success' | 'error';
  message: string;
};

const emptyForm: ProductForm = {
  name: '',
  description: '',
  category: '',
  priceLabel: 'Free',
  imageUrl: '',
  url: '',
};

const inputClass = `
  w-full rounded-xl border border-white/10
  bg-black/30 px-4 py-3 text-sm text-white
  outline-none placeholder:text-zinc-500
  transition focus:border-indigo-400/60
  focus:ring-2 focus:ring-indigo-500/10
`;

const panelClass = `
  rounded-2xl border border-white/10
  bg-white/[0.035] backdrop-blur-xl
`;

const buttonSecondary = `
  inline-flex items-center justify-center gap-2
  rounded-xl border border-white/10
  bg-white/[0.04] px-4 py-3 text-sm
  text-zinc-200 transition
  hover:border-white/20 hover:bg-white/[0.08]
  disabled:cursor-not-allowed disabled:opacity-50
`;

export default function Marketplace() {
  const [user, setUser] = useState<User | null>(
    auth?.currentUser || null,
  );

  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const [notice, setNotice] = useState<Notice | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(
    null,
  );

  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  function showNotice(type: Notice['type'], message: string) {
    setNotice({ type, message });
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      showNotice(
        'error',
        'Firebase Authentication belum tersedia.',
      );
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        setIsAdmin(false);

        if (!currentUser) return;

        try {
          const tokenResult = await getIdTokenResult(
            currentUser,
            true,
          );

          setIsAdmin(tokenResult.claims.admin === true);
        } catch {
          setIsAdmin(false);
        }
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target as Node)
      ) {
        setCategoryMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setCategoryMenuOpen(false);
        setDeleteTarget(null);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick,
      );
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  async function loadProducts(isRefresh = false) {
    if (isRefresh) setRefreshing(true);

    setLoading(true);

    try {
      const response = await fetch('/api/marketplace-products', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || 'Gagal memuat produk.',
        );
      }

      setProducts(
        Array.isArray(data.products) ? data.products : [],
      );

      if (isRefresh) {
        showNotice('success', 'Daftar produk berhasil diperbarui.');
      }
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal memuat produk.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function uploadProductImage(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!user || !isAdmin) {
      showNotice(
        'error',
        'Hanya admin yang dapat mengunggah gambar produk.',
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotice('error', 'Ukuran gambar maksimal 5 MB.');
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedTypes.includes(file.type)) {
      showNotice(
        'error',
        'Gunakan gambar JPG, PNG, WEBP, atau GIF.',
      );
      return;
    }

    try {
      setUploadingImage(true);
      setNotice(null);

      const token = await user.getIdToken();

      const imageData = await new Promise<string>(
        (resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Gambar tidak dapat dibaca.'));
            }
          };

          reader.onerror = () => {
            reject(new Error('Gagal membaca gambar.'));
          };

          reader.readAsDataURL(file);
        },
      );

      const image = imageData.split(',')[1];

      if (!image) {
        throw new Error('Format gambar tidak valid.');
      }

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image,
          name:
            file.name.replace(/\.[^.]+$/, '').slice(0, 100) ||
            'marketplace-product',
          contentType: file.type,
        }),
      });

      const result = await response.json();

      if (!response.ok || typeof result.url !== 'string') {
        throw new Error(
          result.message || result.error || 'Upload gambar gagal.',
        );
      }

      setForm((current) => ({
        ...current,
        imageUrl: result.url,
      }));

      showNotice('success', 'Gambar berhasil diunggah.');
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error ? err.message : 'Upload gambar gagal.',
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !isAdmin) {
      showNotice(
        'error',
        'Hanya admin yang dapat menambahkan produk.',
      );
      return;
    }

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.category.trim() ||
      !form.url.trim()
    ) {
      showNotice(
        'error',
        'Nama, kategori, deskripsi, dan link produk wajib diisi.',
      );
      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      const token = await user.getIdToken();

      const response = await fetch('/api/marketplace-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category.trim(),
          priceLabel: form.priceLabel.trim() || 'Free',
          imageUrl: form.imageUrl.trim(),
          url: form.url.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || 'Gagal menambahkan produk.',
        );
      }

      setForm({ ...emptyForm });
      setShowForm(false);

      showNotice('success', 'Produk berhasil ditambahkan.');

      await loadProducts();
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal menambahkan produk.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!deleteTarget || !user || !isAdmin) return;

    const product = deleteTarget;

    try {
      setDeletingId(product.id);
      setNotice(null);

      const token = await user.getIdToken();

      const response = await fetch(
        `/api/marketplace-products?id=${encodeURIComponent(product.id)}`,
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
          data.error || data.message || 'Gagal menghapus produk.',
        );
      }

      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );

      setDeleteTarget(null);
      showNotice('success', 'Produk berhasil dihapus.');
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error ? err.message : 'Gagal menghapus produk.',
      );
    } finally {
      setDeletingId('');
    }
  }

  const availableCategories = useMemo(() => {
    const distinct = new Map<string, string>();

    products.forEach((product) => {
      const value = product.category?.trim();

      if (value) {
        const key = value.toLowerCase();

        if (!distinct.has(key)) distinct.set(key, value);
      }
    });

    return [
      { value: 'All', label: 'Semua kategori' },
      ...Array.from(distinct.values())
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesCategory =
        category === 'All' ||
        product.category?.toLowerCase() === category.toLowerCase();

      const matchesSearch =
        !keyword ||
        [
          product.name,
          product.description,
          product.category,
          product.priceLabel,
        ]
          .join(' ')
          .toLowerCase()
          .includes(keyword);

      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  const selectedCategory =
    availableCategories.find((item) => item.value === category) ??
    { value: category, label: category };

  return (
    <Shell>
      <main className="mx-auto min-h-[65vh] max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-indigo-300">
              <Store size={18} />
              <span className="text-xs uppercase tracking-[.22em]">
                Developer Store
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Marketplace
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Temukan tools, resource, dan layanan developer di
              ScriptStationV2.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadProducts(true)}
              disabled={loading}
              className={buttonSecondary}
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin' : ''}
              />
              Muat ulang
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  setShowForm((current) => !current);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                {showForm ? <X size={17} /> : <Plus size={17} />}
                {showForm ? 'Tutup Form' : 'Tambah Produk'}
              </button>
            )}
          </div>
        </section>

        {notice && (
          <div
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${
              notice.type === 'error'
                ? 'border-red-400/20 bg-red-500/[0.08] text-red-200'
                : 'border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200'
            }`}
          >
            {notice.type === 'error' ? (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            )}

            <p className="min-w-0 flex-1 text-sm leading-6">
              {notice.message}
            </p>

            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Tutup notifikasi"
              className="rounded-lg p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {showForm && isAdmin && (
          <section className={`${panelClass} mt-8 p-5 sm:p-7`}>
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[.18em] text-indigo-300">
                Product Management
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                Tambah Produk Baru
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Lengkapi informasi produk yang ingin ditampilkan di
                Marketplace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-300">
                    Nama produk *
                  </span>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Contoh: WhatsApp Bot Tools"
                    maxLength={100}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-300">
                    Kategori *
                  </span>
                  <input
                    className={inputClass}
                    type="text"
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    placeholder="AI Tools, WhatsApp Bot, Hosting..."
                    maxLength={60}
                    required
                  />
                  <span className="mt-2 block text-xs leading-5 text-zinc-500">
                    Tulis kategori sendiri. Kategori akan muncul di filter
                    setelah produk disimpan.
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-300">
                    Harga / label
                  </span>
                  <input
                    className={inputClass}
                    value={form.priceLabel}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priceLabel: event.target.value,
                      }))
                    }
                    placeholder="Free, Rp25.000, atau Premium"
                    maxLength={40}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-300">
                    Link produk *
                  </span>
                  <input
                    className={inputClass}
                    type="url"
                    value={form.url}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        url: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                    maxLength={2048}
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm text-zinc-300">
                  Deskripsi produk *
                </span>
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Jelaskan fungsi dan kegunaan produk..."
                  maxLength={2000}
                  required
                />
              </label>

              <div>
                <span className="mb-2 block text-sm text-zinc-300">
                  Gambar produk
                </span>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={uploadProductImage}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className={buttonSecondary}
                >
                  {uploadingImage ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <ImagePlus size={17} />
                  )}
                  {uploadingImage
                    ? 'Mengunggah gambar...'
                    : 'Pilih gambar dari galeri'}
                </button>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  JPG, PNG, WEBP, atau GIF. Maksimal 5 MB.
                </p>

                {form.imageUrl && (
                  <div className="mt-4 max-w-xs">
                    <img
                      src={form.imageUrl}
                      alt="Preview produk"
                      className="aspect-video w-full rounded-xl border border-white/10 object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          imageUrl: '',
                        }))
                      }
                      className="mt-2 inline-flex items-center gap-2 text-sm text-red-300 transition hover:text-red-200"
                    >
                      <Trash2 size={14} />
                      Hapus gambar
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <LoaderCircle size={17} className="animate-spin" />
                  )}
                  {saving ? 'Menyimpan...' : 'Simpan Produk'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setNotice(null);
                  }}
                  className={buttonSecondary}
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />

              <input
                className={`${inputClass} pl-11`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama atau deskripsi produk..."
                aria-label="Cari produk"
              />
            </div>

            <div className="relative sm:w-64" ref={categoryMenuRef}>
              <button
                type="button"
                aria-label="Filter kategori"
                aria-expanded={categoryMenuOpen}
                onClick={() =>
                  setCategoryMenuOpen((current) => !current)
                }
                className="flex min-h-[46px] w-full items-center gap-3 rounded-xl border border-white/10 bg-[#101015]/95 px-4 py-3 text-left text-sm text-white shadow-lg shadow-black/10 transition hover:border-indigo-400/30 hover:bg-[#171720]"
              >
                <SlidersHorizontal
                  size={16}
                  className="shrink-0 text-indigo-300"
                />

                <span className="min-w-0 flex-1 truncate">
                  {selectedCategory.label}
                </span>

                <ChevronDown
                  size={16}
                  className={`shrink-0 text-zinc-400 transition ${
                    categoryMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {categoryMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-30 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#101015] p-1.5 shadow-2xl shadow-black/50">
                  {availableCategories.map((item) => {
                    const selected = category === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setCategory(item.value);
                          setCategoryMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                          selected
                            ? 'bg-indigo-500/15 text-indigo-200'
                            : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span className="min-w-0 flex-1 break-words">
                          {item.label}
                        </span>

                        {selected && (
                          <Check
                            size={16}
                            className="shrink-0 text-indigo-300"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              {loading
                ? 'Memuat daftar produk...'
                : `${filteredProducts.length} produk ditemukan`}
            </p>

            {(search || category !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('All');
                }}
                className="text-xs text-indigo-300 transition hover:text-indigo-200"
              >
                Reset filter
              </button>
            )}
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div
              className={`${panelClass} flex min-h-52 flex-col items-center justify-center gap-3 p-6`}
            >
              <LoaderCircle
                size={28}
                className="animate-spin text-indigo-300"
              />
              <p className="text-sm text-zinc-400">
                Memuat produk...
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div
              className={`${panelClass} flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center`}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400">
                <Package size={27} />
              </div>

              <h2 className="text-lg font-semibold text-white">
                {products.length === 0
                  ? 'Belum ada produk'
                  : 'Produk tidak ditemukan'}
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
                {products.length === 0
                  ? 'Produk Marketplace akan tampil di sini setelah berhasil dimuat atau ditambahkan.'
                  : 'Coba kata kunci lain atau ubah filter kategori.'}
              </p>

              {(search || category !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategory('All');
                  }}
                  className={`${buttonSecondary} mt-5`}
                >
                  Reset pencarian
                </button>
              )}

              {!user && (
                <Link
                  to="/login"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-indigo-100"
                >
                  <LogIn size={16} />
                  Login
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className={`${panelClass} group flex min-w-0 flex-col overflow-hidden transition duration-300 hover:border-indigo-400/30 hover:bg-white/[0.055]`}
                >
                  <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-zinc-900">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/10 via-zinc-900 to-purple-500/10 text-indigo-300">
                        <Store size={38} />
                      </div>
                    )}

                    <span className="absolute left-3 top-3 max-w-[80%] truncate rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-md">
                      {product.category || 'Lainnya'}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="break-words text-lg font-semibold leading-6 text-white">
                        {product.name}
                      </h2>

                      <span className="shrink-0 rounded-lg border border-emerald-400/10 bg-emerald-400/[0.08] px-2 py-1 text-xs font-medium text-emerald-300">
                        {product.priceLabel || 'Free'}
                      </span>
                    </div>

                    <p className="mt-3 flex-1 whitespace-pre-line break-words text-sm leading-6 text-zinc-400">
                      {product.description}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-indigo-100"
                      >
                        Kunjungi Produk
                        <ExternalLink size={15} />
                      </a>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          disabled={deletingId === product.id}
                          aria-label={`Hapus ${product.name}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/[0.05] px-3 text-red-300 transition hover:bg-red-500/[0.12] disabled:opacity-50"
                        >
                          {deletingId === product.id ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingId) {
              setDeleteTarget(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111116] p-5 shadow-2xl shadow-black/50 sm:p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300">
                <AlertTriangle size={23} />
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  id="delete-product-title"
                  className="text-lg font-semibold text-white"
                >
                  Hapus produk?
                </h2>

                <p className="mt-2 break-words text-sm leading-6 text-zinc-400">
                  Kamu akan menghapus{' '}
                  <span className="font-medium text-zinc-200">
                    {deleteTarget.name}
                  </span>
                  . Tindakan ini tidak dapat dibatalkan dari halaman ini.
                </p>
              </div>

              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(null)}
                aria-label="Tutup dialog"
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(null)}
                className={buttonSecondary}
              >
                Batal
              </button>

              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => void deleteProduct()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {deletingId ? 'Menghapus...' : 'Ya, hapus produk'}
              </button>
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}