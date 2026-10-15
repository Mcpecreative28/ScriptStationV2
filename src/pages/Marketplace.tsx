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

  const [form, setForm] = useState<ProductForm>(
    emptyForm,
  );

  const [saving, setSaving] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(
    false,
  );

  const imageInputRef = useRef<HTMLInputElement | null>(
    null,
  );


  useEffect(() => {
    if (!auth) {
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
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Gagal memuat produk.',
      );
    } finally {
      setLoading(false);
    }
  }


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
        'Format gambar tidak didukung.',
      );

      return;
    }

    try {
      setUploadingImage(true);

      setError('');

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

      setForm((currentForm) => ({
        ...currentForm,

        imageUrl: result.url,
      }));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Upload gambar gagal.',
      );
    } finally {
      setUploadingImage(false);
    }
  }


  return (
    <Shell>
      <main
        className="
          mx-auto
          max-w-7xl
          px-4
          pb-16
          pt-28
          sm:px-6
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
              "
            >
              Temukan tools, resource, dan layanan
              developer di ScriptStationV2.
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
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
              "
            >
              <Plus size={17} />

              Tambah Produk
            </button>
          )}
        </section>
      </main>
    </Shell>
  );
}