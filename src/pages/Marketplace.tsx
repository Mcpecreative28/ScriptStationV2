
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


const emptyForm: ProductForm = {
  name: '',
  description: '',
  category: 'Tools',
  priceLabel: 'Free',
  imageUrl: '',
  url: '',
};


const categories = [
  'Tools',
  'Scripts',
  'Plugins',
  'Bot',
  'Website',
  'Hosting',
  'Design',
  'Lainnya',
];


const inputClass = `
  w-full
  rounded-xl
  border
  border-white/10
  bg-black/30
  px-4
  py-3
  text-sm
  text-white
  outline-none
  placeholder:text-zinc-500
  focus:border-indigo-400/60
`;


const panelClass = `
  rounded-2xl
  border
  border-white/10
  bg-white/[0.035]
  backdrop-blur-xl
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

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<ProductForm>(
    emptyForm,
  );

  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(
    false,
  );

  const [deletingId, setDeletingId] = useState('');

  const imageInputRef = useRef<HTMLInputElement | null>(
    null,
  );


  useEffect(() => {
    if (!auth) {
      setLoading(false);

      setError(
        'Firebase Authentication belum tersedia.',
      );

      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        setIsAdmin(false);

        if (!currentUser) {
          return;
        }

        try {
          const tokenResult = await getIdTokenResult(
            currentUser,
            true,
          );

          setIsAdmin(
            tokenResult.claims.admin === true,
          );
        } catch {
          setIsAdmin(false);
        }
      },
    );

    return unsubscribe;
  }, []);


  async function loadProducts() {
    try {
      setError('');

      const response = await fetch(
        '/api/marketplace-products',
        {
          method: 'GET',
          cache: 'no-store',
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            'Gagal memuat produk.',
        );
      }

      setProducts(
        Array.isArray(data.products)
          ? data.products
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat produk.',
      );
    } finally {
      setLoading(false);
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

    if (!file) {
      return;
    }

    if (!user || !isAdmin) {
      setError(
        'Hanya admin yang dapat mengunggah gambar produk.',
      );

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        'Ukuran gambar maksimal 5 MB.',
      );

      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        'Gunakan gambar JPG, PNG, WEBP, atau GIF.',
      );

      return;
    }

    try {
      setUploadingImage(true);

      setError('');

      setSuccess('');

      const token = await user.getIdToken();

      const imageData = await new Promise<string>(
        (resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            if (
              typeof reader.result === 'string'
            ) {
              resolve(reader.result);
            } else {
              reject(
                new Error(
                  'Gambar tidak dapat dibaca.',
                ),
              );
            }
          };

          reader.onerror = () => {
            reject(
              new Error(
                'Gagal membaca gambar.',
              ),
            );
          };

          reader.readAsDataURL(file);
        },
      );

      const image = imageData.split(',')[1];

      if (!image) {
        throw new Error(
          'Format gambar tidak valid.',
        );
      }

      const response = await fetch(
        '/api/upload-image',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            image,

            name:
              file.name
                .replace(/\.[^.]+$/, '')
                .slice(0, 100) ||
              'marketplace-product',

            contentType: file.type,
          }),
        },
      );

      const result = await response.json();

      if (
        !response.ok ||
        typeof result.url !== 'string'
      ) {
        throw new Error(
          result.message ||
            result.error ||
            'Upload gambar gagal.',
        );
      }

      setForm((current) => ({
        ...current,
        imageUrl: result.url,
      }));

      setSuccess(
        'Gambar berhasil diunggah.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Upload gambar gagal.',
      );
    } finally {
      setUploadingImage(false);
    }
  }


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!user || !isAdmin) {
      setError(
        'Hanya admin yang dapat menambahkan produk.',
      );

      return;
    }

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.url.trim()
    ) {
      setError(
        'Nama, deskripsi, dan link produk wajib diisi.',
      );

      return;
    }

    try {
      setSaving(true);

      setError('');

      setSuccess('');

      const token = await user.getIdToken();

      const response = await fetch(
        '/api/marketplace-products',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
            category: form.category,
            priceLabel: form.priceLabel.trim() || 'Free',
            imageUrl: form.imageUrl.trim(),
            url: form.url.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            'Gagal menambahkan produk.',
        );
      }

      setForm({ ...emptyForm });

      setShowForm(false);

      setSuccess(
        'Produk berhasil ditambahkan.',
      );

      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menambahkan produk.',
      );
    } finally {
      setSaving(false);
    }
  }


  async function deleteProduct(id: string) {
    if (!user || !isAdmin) {
      setError(
        'Hanya admin yang dapat menghapus produk.',
      );

      return;
    }

    const confirmed = window.confirm(
      'Yakin ingin menghapus produk ini?',
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      setError('');

      setSuccess('');

      const token = await user.getIdToken();

      const response = await fetch(
        `/api/marketplace-products?id=${encodeURIComponent(id)}`,
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
          data.error ||
            data.message ||
            'Gagal menghapus produk.',
        );
      }

      setProducts((current) =>
        current.filter(
          (product) => product.id !== id,
        ),
      );

      setSuccess(
        'Produk berhasil dihapus.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus produk.',
      );
    } finally {
      setDeletingId('');
    }
  }


  const availableCategories = useMemo(() => {
    return [
      'All',
      ...new Set(
        products
          .map((product) => product.category)
          .filter(Boolean),
      ),
    ];
  }, [products]);


  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesCategory =
        category === 'All' ||
        product.category === category;

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

      return (
        matchesCategory &&
        matchesSearch
      );
    });
  }, [products, search, category]);


  return (
    <Shell>
      <main
        className="
          mx-auto
          min-h-[65vh]
          max-w-7xl
          px-4
          pb-16
          pt-28
          sm:px-6
          lg:px-8
        "
      >
        <section
          className="
            flex
            flex-col
            justify-between
            gap-5
            sm:flex-row
            sm:items-end
          "
        >
          <div>
            <div
              className="
                mb-3
                flex
                items-center
                gap-2
                text-indigo-300
              "
            >
              <Store size={18} />

              <span
                className="
                  text-xs
                  uppercase
                  tracking-[.22em]
                "
              >
                Developer Store
              </span>
            </div>

            <h1
              className="
                text-3xl
                font-semibold
                tracking-tight
                text-white
                sm:text-4xl
              "
            >
              Marketplace
            </h1>

            <p
              className="
                mt-3
                max-w-2xl
                text-sm
                leading-6
                text-zinc-400
                sm:text-base
              "
            >
              Temukan tools, resource, dan layanan
              developer di ScriptStationV2.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setLoading(true);

                void loadProducts();
              }}
              disabled={loading}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-white/10
                bg-white/5
                px-4
                py-3
                text-sm
                text-white
                transition
                hover:bg-white/10
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? 'animate-spin'
                    : ''
                }
              />

              Muat ulang
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setError('');

                  setSuccess('');

                  setShowForm(
                    (current) => !current,
                  );
                }}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-white
                  px-4
                  py-3
                  text-sm
                  font-semibold
                  text-black
                  transition
                  hover:bg-indigo-100
                "
              >
                {showForm ? (
                  <X size={17} />
                ) : (
                  <Plus size={17} />
                )}

                {showForm
                  ? 'Tutup Form'
                  : 'Tambah Produk'}
              </button>
            )}
          </div>
        </section>


        {error && (
          <div
            role="alert"
            className="
              mt-6
              rounded-xl
              border
              border-red-400/20
              bg-red-500/10
              px-4
              py-3
              text-sm
              leading-6
              text-red-200
            "
          >
            {error}
          </div>
        )}


        {success && (
          <div
            role="status"
            className="
              mt-6
              rounded-xl
              border
              border-emerald-400/20
              bg-emerald-500/10
              px-4
              py-3
              text-sm
              text-emerald-200
            "
          >
            {success}
          </div>
        )}


        {showForm && isAdmin && (
          <section
            className={`${panelClass} mt-8 p-5 sm:p-7`}
          >
            <div className="mb-6">
              <h2
                className="
                  text-xl
                  font-semibold
                  text-white
                "
              >
                Tambah Produk Baru
              </h2>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-zinc-400
                "
              >
                Isi informasi produk yang ingin
                ditampilkan di Marketplace.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span
                    className="
                      mb-2
                      block
                      text-sm
                      text-zinc-300
                    "
                  >
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
                  <span
                    className="
                      mb-2
                      block
                      text-sm
                      text-zinc-300
                  "
                >
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
                  placeholder="Contoh: AI Tools, WhatsApp Bot, Hosting..."
                  maxLength={60}
                  required
                />
              </label>


                <label className="block">
                  <span
                    className="
                      mb-2
                      block
                      text-sm
                      text-zinc-300
                    "
                  >
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
                  <span
                    className="
                      mb-2
                      block
                      text-sm
                      text-zinc-300
                    "
                  >
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
                <span
                  className="
                    mb-2
                    block
                    text-sm
                    text-zinc-300
                  "
                >
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
                <span
                  className="
                    mb-2
                    block
                    text-sm
                    text-zinc-300
                  "
                >
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
                  onClick={() =>
                    imageInputRef.current?.click()
                  }
                  disabled={uploadingImage}
                  className="
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-white/10
                    bg-white/5
                    px-4
                    py-3
                    text-sm
                    text-white
                    transition
                    hover:bg-white/10
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {uploadingImage ? (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <ImagePlus size={17} />
                  )}

                  {uploadingImage
                    ? 'Mengunggah gambar...'
                    : 'Pilih gambar dari galeri'}
                </button>

                <p
                  className="
                    mt-2
                    text-xs
                    leading-5
                    text-zinc-500
                  "
                >
                  JPG, PNG, WEBP, atau GIF.
                  Maksimal 5 MB.
                </p>

                {form.imageUrl && (
                  <div className="mt-4 max-w-xs">
                    <img
                      src={form.imageUrl}
                      alt="Preview produk"
                      className="
                        aspect-video
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        object-cover
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          imageUrl: '',
                        }))
                      }
                      className="
                        mt-2
                        text-sm
                        text-red-300
                        hover:text-red-200
                      "
                    >
                      Hapus gambar
                    </button>
                  </div>
                )}
              </div>


              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={
                    saving || uploadingImage
                  }
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-indigo-500
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-indigo-400
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {saving && (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {saving
                    ? 'Menyimpan...'
                    : 'Simpan Produk'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);

                    setError('');
                  }}
                  className="
                    rounded-xl
                    border
                    border-white/10
                    px-5
                    py-3
                    text-sm
                    text-zinc-300
                    transition
                    hover:bg-white/5
                  "
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        )}


        <section className="mt-10">
          <div
            className="
              flex
              flex-col
              gap-4
              sm:flex-row
            "
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="
                  pointer-events-none
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-zinc-500
                "
              />

              <input
                className={`${inputClass} pl-11`}
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Cari nama atau deskripsi produk..."
              />
            </div>

            <div className="sm:w-56">
              <select
                className={inputClass}
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                aria-label="Filter kategori"
              >
                {availableCategories.map((item) => (
                  <option
                    key={item}
                    value={item}
                    className="bg-zinc-900"
                  >
                    {item === 'All'
                      ? 'Semua kategori'
                      : item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>


        <section className="mt-7">
          {loading ? (
            <div
              className={`
                ${panelClass}
                flex
                min-h-52
                flex-col
                items-center
                justify-center
                gap-3
                p-6
              `}
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
              className={`
                ${panelClass}
                flex
                min-h-64
                flex-col
                items-center
                justify-center
                px-5
                py-12
                text-center
              `}
            >
              <div
                className="
                  mb-4
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white/5
                  text-zinc-400
                "
              >
                <Package size={27} />
              </div>

              <h2
                className="
                  text-lg
                  font-semibold
                  text-white
                "
              >
                {products.length === 0
                  ? 'Belum ada produk'
                  : 'Produk tidak ditemukan'}
              </h2>

              <p
                className="
                  mt-2
                  max-w-md
                  text-sm
                  leading-6
                  text-zinc-400
                "
              >
                {products.length === 0
                  ? 'Produk Marketplace akan tampil di sini setelah berhasil dimuat atau ditambahkan.'
                  : 'Coba kata kunci lain atau ubah filter kategori.'}
              </p>

              {search || category !== 'All' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');

                    setCategory('All');
                  }}
                  className="
                    mt-5
                    rounded-xl
                    border
                    border-white/10
                    px-4
                    py-2
                    text-sm
                    text-white
                    hover:bg-white/5
                  "
                >
                  Reset pencarian
                </button>
              ) : null}

              {!user && (
                <Link
                  to="/login"
                  className="
                    mt-5
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-white
                    px-4
                    py-3
                    text-sm
                    font-semibold
                    text-black
                  "
                >
                  <LogIn size={16} />
                  Login
                </Link>
              )}
            </div>
          ) : (
            <div
              className="
                grid
                grid-cols-1
                gap-5
                sm:grid-cols-2
                lg:grid-cols-3
              "
            >
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className={`
                    ${panelClass}
                    group
                    flex
                    min-w-0
                    flex-col
                    overflow-hidden
                    transition
                    duration-300
                    hover:border-indigo-400/30
                    hover:bg-white/[0.055]
                  `}
                >
                  <div
                    className="
                      relative
                      aspect-[16/9]
                      overflow-hidden
                      border-b
                      border-white/10
                      bg-zinc-900
                    "
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="
                          h-full
                          w-full
                          object-cover
                          transition
                          duration-500
                          group-hover:scale-105
                        "
                        onError={(event) => {
                          event.currentTarget.style.display =
                            'none';
                        }}
                      />
                    ) : (
                      <div
                        className="
                          flex
                          h-full
                          w-full
                          items-center
                          justify-center
                          bg-gradient-to-br
                          from-indigo-500/10
                          via-zinc-900
                          to-purple-500/10
                          text-indigo-300
                        "
                      >
                        <Store size={38} />
                      </div>
                    )}

                    <span
                      className="
                        absolute
                        left-3
                        top-3
                        rounded-full
                        border
                        border-white/10
                        bg-black/70
                        px-3
                        py-1
                        text-xs
                        text-white
                        backdrop-blur-md
                      "
                    >
                      {product.category || 'Lainnya'}
                    </span>
                  </div>


                  <div className="flex flex-1 flex-col p-5">
                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-3
                      "
                    >
                      <h2
                        className="
                          break-words
                          text-lg
                          font-semibold
                          leading-6
                          text-white
                        "
                      >
                        {product.name}
                      </h2>

                      <span
                        className="
                          shrink-0
                          rounded-lg
                          bg-emerald-400/10
                          px-2
                          py-1
                          text-xs
                          font-medium
                          text-emerald-300
                        "
                      >
                        {product.priceLabel || 'Free'}
                      </span>
                    </div>

                    <p
                      className="
                        mt-3
                        flex-1
                        whitespace-pre-line
                        break-words
                        text-sm
                        leading-6
                        text-zinc-400
                      "
                    >
                      {product.description}
                    </p>

                    <div
                      className="
                        mt-5
                        flex
                        flex-wrap
                        items-center
                        gap-2
                        border-t
                        border-white/10
                        pt-4
                      "
                    >
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="
                          inline-flex
                          min-h-10
                          flex-1
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          bg-white
                          px-3
                          py-2
                          text-sm
                          font-semibold
                          text-black
                          transition
                          hover:bg-indigo-100
                        "
                      >
                        Kunjungi Produk

                        <ExternalLink size={15} />
                      </a>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            void deleteProduct(product.id)
                          }
                          disabled={
                            deletingId === product.id
                          }
                          aria-label={
                            `Hapus ${product.name}`
                          }
                          className="
                            inline-flex
                            min-h-10
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-red-400/20
                            bg-red-500/5
                            px-3
                            text-red-300
                            transition
                            hover:bg-red-500/15
                            disabled:opacity-50
                          "
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
    </Shell>
  );
}