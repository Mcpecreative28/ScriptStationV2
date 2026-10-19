
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  ExternalLink,
  FileCode2,
  ImagePlus,
  Info,
  Link2,
  Loader2,
  LockKeyhole,
  Monitor,
  Palette,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  FileImage,
  CircleAlert,
} from 'lucide-react';

import Shell from '../components/Shell';
import { auth, db } from '../lib/firebase';

type ResourceKind = 'Script' | 'Snippet' | 'Baileys';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_SOURCE_LENGTH = 200000;

const SCRIPT_TYPES = [
  'Full Case',
  'Full Plugins',
  'Plugins + Case',
];

const PLATFORMS = [
  'WhatsApp Bot',
  'Telegram Bot',
  'Discord Bot',
  'Website',
];

const SNIPPET_TYPES = [
  'Case',
  'Plugin',
  'Function',
  'Utility',
  'Config',
  'Other',
];

const LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'PHP',
  'Java',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Ruby',
  'Kotlin',
  'Swift',
  'HTML',
  'CSS',
  'SQL',
  'Shell',
  'Other',
];

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  icon,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
        {label}
        {required && <span className="text-violet-300">*</span>}
      </span>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
            {icon}
          </span>
        )}

        <input
          type={type}
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full min-w-0 rounded-xl border border-white/[0.09] bg-black/30 py-3.5 text-sm text-white outline-none transition duration-200 placeholder:text-zinc-600 hover:border-white/[0.15] focus:border-violet-400/50 focus:bg-black/40 focus:ring-4 focus:ring-violet-500/[0.07] ${
            icon ? 'pl-10 pr-4' : 'px-4'
          }`}
        />
      </div>

      {hint && (
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          {hint}
        </p>
      )}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  code = false,
  required = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  code?: boolean;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
        {label}
        {required && <span className="text-violet-300">*</span>}
      </span>

      <textarea
        value={value}
        required={required}
        maxLength={code ? MAX_SOURCE_LENGTH : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={!code}
        className={`w-full min-w-0 resize-y rounded-xl border border-white/[0.09] bg-black/30 p-4 text-sm text-white outline-none transition duration-200 placeholder:text-zinc-600 hover:border-white/[0.15] focus:border-violet-400/50 focus:bg-black/40 focus:ring-4 focus:ring-violet-500/[0.07] ${
          code
            ? 'code min-h-[280px] leading-6'
            : 'min-h-[130px] leading-6'
        }`}
      />

      {hint && (
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          {hint}
        </p>
      )}

      {code && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-600">
            Source code
          </span>

          <span
            className={`text-xs tabular-nums ${
              value.length >= MAX_SOURCE_LENGTH
                ? 'text-amber-300'
                : 'text-zinc-500'
            }`}
          >
            {value.length.toLocaleString('id-ID')} /{' '}
            {MAX_SOURCE_LENGTH.toLocaleString('id-ID')}
          </span>
        </div>
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
        {label}
        {required && <span className="text-violet-300">*</span>}
      </span>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setSearch('');
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-black/30 px-4 py-3.5 text-left text-sm outline-none transition duration-200 hover:border-white/[0.18] focus:ring-4 focus:ring-violet-500/[0.07] ${
          open
            ? 'border-violet-400/50 ring-4 ring-violet-500/[0.07]'
            : 'border-white/[0.09]'
        }`}
      >
        <span className={value ? 'text-zinc-100' : 'text-zinc-600'}>
          {value || placeholder || `Pilih ${label}`}
        </span>

        <ChevronDown
          size={16}
          className={`shrink-0 text-zinc-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#111116] shadow-[0_20px_70px_rgba(0,0,0,0.65)]">
          {options.length > 8 && (
            <div className="border-b border-white/[0.07] p-2">
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Cari ${label.toLowerCase()}...`}
                className="w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
              />
            </div>
          )}

          <div className="scrollbar max-h-56 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-zinc-500">
                Tidak ada pilihan yang cocok.
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    value === option
                      ? 'bg-violet-500/15 text-violet-200'
                      : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span>{option}</span>

                  {value === option && (
                    <Check size={15} className="shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08] text-xs font-semibold text-violet-200">
        {number}
      </div>

      <div className="min-w-0 pt-0.5">
        <h2 className="text-base font-semibold tracking-tight text-white">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function Notice({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'error';
}) {
  const styles = {
    neutral:
      'border-white/[0.08] bg-white/[0.025] text-zinc-400',
    success:
      'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200',
    error:
      'border-red-400/20 bg-red-400/[0.06] text-red-200',
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${styles[tone]}`}
    >
      {tone === 'success' ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      ) : tone === 'error' ? (
        <CircleAlert size={18} className="mt-0.5 shrink-0" />
      ) : (
        <Info size={18} className="mt-0.5 shrink-0" />
      )}

      <div className="min-w-0">{children}</div>
    </div>
  );
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' ||
      url.protocol === 'http:'
    );
  } catch {
    return false;
  }
}

function isAllowedHost(value: string, hosts: string[]) {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' &&
      hosts.includes(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

function getKind(pathname: string): ResourceKind {
  if (pathname.startsWith('/snippets/upload')) {
    return 'Snippet';
  }

  if (pathname.startsWith('/baileys/upload')) {
    return 'Baileys';
  }

  return 'Script';
}

function getKindDetails(kind: ResourceKind) {
  if (kind === 'Snippet') {
    return {
      eyebrow: 'CODE CONTRIBUTION',
      title: 'Share a snippet.',
      description:
        'Bagikan potongan kode yang bermanfaat agar developer lain bisa belajar dan menggunakannya.',
      icon: Code2,
      number: '02',
    };
  }

  if (kind === 'Baileys') {
    return {
      eyebrow: 'BAILEYS CONTRIBUTION',
      title: 'Build together.',
      description:
        'Bagikan source code Baileys dan bantu komunitas mengembangkan project WhatsApp.',
      icon: UploadCloud,
      number: '03',
    };
  }

  return {
    eyebrow: 'SCRIPT CONTRIBUTION',
    title: 'Publish your work.',
    description:
      'Perkenalkan script buatanmu kepada komunitas. Lengkapi detail dan tautan agar resource mudah dipahami.',
    icon: FileCode2,
    number: '01',
  };
}

export default function Upload() {
  const navigate = useNavigate();
  const location = useLocation();

  const kind = useMemo(
    () => getKind(location.pathname),
    [location.pathname]
  );

  const details = getKindDetails(kind);
  const HeaderIcon = details.icon;

  const [user, setUser] = useState<User | null>(null);

  const [title, setTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewImageUrlsText, setPreviewImageUrlsText] = useState('');
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('');
  const [sourceCode, setSourceCode] = useState('');

  const [scriptType, setScriptType] = useState('');
  const [platform, setPlatform] = useState('');
  const [snippetType, setSnippetType] = useState('');

  const [mediafireUrl, setMediafireUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [localPreviewUrls, setLocalPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [thumbnailFile]);

  useEffect(() => {
    const objectUrls = previewFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setLocalPreviewUrls(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewFiles]);

  const previewUrls = useMemo(() => {
    return previewImageUrlsText
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);
  }, [previewImageUrlsText]);

  const cleanThumbnailUrl = thumbnailUrl.trim();
  const activeThumbnail = thumbnailPreview || cleanThumbnailUrl;

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  function validateImage(file: File) {
    if (!file.type.startsWith('image/')) {
      return `${file.name}: file harus berupa gambar.`;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return `${file.name}: ukuran gambar maksimal 5 MB.`;
    }

    return '';
  }

  function handleThumbnailChange(file: File | null) {
    clearMessages();

    if (!file) {
      setThumbnailFile(null);
      return;
    }

    const validationError = validateImage(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setThumbnailFile(file);
    setThumbnailUrl('');
  }

  function handlePreviewFilesChange(files: File[]) {
    clearMessages();

    const validationError = files
      .map(validateImage)
      .find(Boolean);

    if (validationError) {
      setError(validationError);
      return;
    }

    setPreviewFiles(files);
  }

  async function handleSubmit() {
    clearMessages();

    if (submitting) {
      return;
    }

    if (!user) {
      setError('Kamu harus login terlebih dahulu.');
      return;
    }

    if (!db) {
      setError('Firebase Firestore belum terkonfigurasi.');
      return;
    }

    const cleanTitle = title.trim();
    const cleanThumbnail = thumbnailUrl.trim();
    const cleanAuthor = author.trim();
    const cleanDescription = description.trim();
    const cleanLanguage = language.trim();
    const cleanSourceCode = sourceCode.trim();
    const cleanPreviewUrls = previewUrls;
    const cleanMediaFire = mediafireUrl.trim();
    const cleanGitHub = githubUrl.trim();

    if (!cleanTitle) {
      setError('Nama resource wajib diisi.');
      return;
    }

    if (cleanTitle.length < 3) {
      setError('Nama resource minimal 3 karakter.');
      return;
    }

    if (cleanTitle.length > 120) {
      setError('Nama resource maksimal 120 karakter.');
      return;
    }

    if (!cleanDescription) {
      setError('Description wajib diisi.');
      return;
    }

    if (cleanDescription.length > 5000) {
      setError('Description maksimal 5.000 karakter.');
      return;
    }

    if (kind !== 'Script' && !cleanSourceCode) {
      setError('Source code wajib diisi.');
      return;
    }

    if (
      kind !== 'Script' &&
      cleanSourceCode.length > MAX_SOURCE_LENGTH
    ) {
      setError(
        'Source code terlalu besar. Maksimal 200.000 karakter.'
      );
      return;
    }

    if (cleanThumbnail && !isValidHttpUrl(cleanThumbnail)) {
      setError('Thumbnail harus berupa URL HTTP/HTTPS yang valid.');
      return;
    }

    if (kind === 'Script') {
      if (!cleanMediaFire && !cleanGitHub) {
        setError(
          'Isi minimal satu link download: MediaFire atau GitHub.'
        );
        return;
      }

      if (!scriptType) {
        setError('Script Type wajib dipilih.');
        return;
      }

      if (!platform) {
        setError('Platform wajib dipilih.');
        return;
      }

      if (!cleanLanguage) {
        setError('Programming Language wajib diisi.');
        return;
      }

      if (
        cleanMediaFire &&
        !isAllowedHost(cleanMediaFire, [
          'mediafire.com',
          'www.mediafire.com',
        ])
      ) {
        setError(
          'Link MediaFire tidak valid. Gunakan link MediaFire resmi.'
        );
        return;
      }

      if (
        cleanGitHub &&
        !isAllowedHost(cleanGitHub, [
          'github.com',
          'www.github.com',
        ])
      ) {
        setError(
          'Link GitHub tidak valid. Gunakan link GitHub resmi.'
        );
        return;
      }

      if (cleanMediaFire && cleanGitHub) {
        setError(
          'Pilih satu link download saja: MediaFire atau GitHub.'
        );
        return;
      }

      if (
        cleanPreviewUrls.some((url) => !isValidHttpUrl(url))
      ) {
        setError(
          'Semua URL preview harus berupa URL HTTP/HTTPS yang valid.'
        );
        return;
      }

      const selectedFiles = [
        ...(thumbnailFile ? [thumbnailFile] : []),
        ...previewFiles,
      ];

      const imageError = selectedFiles
        .map(validateImage)
        .find(Boolean);

      if (imageError) {
        setError(imageError);
        return;
      }
    }

    if (kind === 'Snippet') {
      if (!snippetType) {
        setError('Snippet Type wajib dipilih.');
        return;
      }

      if (!cleanLanguage) {
        setError('Programming Language wajib diisi.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const firestore = db;

      let finalThumbnailUrl = cleanThumbnail || '';
      const finalPreviewImageUrls = [...cleanPreviewUrls];

      if (
        kind === 'Script' &&
        (thumbnailFile || previewFiles.length > 0)
      ) {
        const token = await user.getIdToken();

        const uploadImage = async (file: File): Promise<string> => {
          const validationError = validateImage(file);

          if (validationError) {
            throw new Error(validationError);
          }

          const base64 = await new Promise<string>(
            (resolve, reject) => {
              const reader = new FileReader();

              reader.onload = () => {
                const result = String(reader.result || '');
                const comma = result.indexOf(',');

                if (comma === -1) {
                  reject(
                    new Error('Gagal membaca file gambar.')
                  );
                } else {
                  resolve(result.slice(comma + 1));
                }
              };

              reader.onerror = () => {
                reject(
                  new Error('Gagal membaca file gambar.')
                );
              };

              reader.readAsDataURL(file);
            }
          );

          const controller = new AbortController();
          const timeout = window.setTimeout(
            () => controller.abort(),
            25000
          );

          try {
            const response = await fetch('/api/upload-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                image: base64,
                name: file.name,
                contentType: file.type,
              }),
              signal: controller.signal,
            });

            const result = await response
              .json()
              .catch(() => ({}));

            if (
              !response.ok ||
              typeof result.url !== 'string'
            ) {
              throw new Error(
                typeof result.message === 'string'
                  ? result.message
                  : `Upload gambar gagal (HTTP ${response.status}).`
              );
            }

            if (!isValidHttpUrl(result.url)) {
              throw new Error(
                'Server mengembalikan URL gambar yang tidak valid.'
              );
            }

            return result.url;
          } catch (uploadError) {
            if (
              uploadError instanceof Error &&
              uploadError.name === 'AbortError'
            ) {
              throw new Error(
                'Upload gambar timeout. Coba gambar lebih kecil.'
              );
            }

            throw uploadError;
          } finally {
            window.clearTimeout(timeout);
          }
        };

        if (thumbnailFile) {
          finalThumbnailUrl = await uploadImage(thumbnailFile);
        }

        for (const file of previewFiles) {
          const uploadedUrl = await uploadImage(file);
          finalPreviewImageUrls.push(uploadedUrl);
        }
      }

      const baseData = {
        resourceType: kind,
        title: cleanTitle,
        thumbnailUrl: finalThumbnailUrl || null,
        description: cleanDescription,
        author: cleanAuthor || user.displayName || 'Anonymous',
        ownerId: user.uid,
        ownerName: user.displayName || 'Anonymous',
        ownerEmail: user.email || null,
        status: 'pending',
        views: 0,
        downloads: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (kind === 'Script') {
        await addDoc(collection(firestore, 'scripts'), {
          ...baseData,
          scriptType,
          platform,
          language: cleanLanguage,
          mediafireUrl: cleanMediaFire || null,
          githubUrl: cleanGitHub || null,
          previewImageUrls: finalPreviewImageUrls,
        });
      }

      if (kind === 'Snippet') {
        await addDoc(collection(firestore, 'scripts'), {
          ...baseData,
          snippetType,
          language: cleanLanguage,
          sourceCode: cleanSourceCode,
        });
      }

      if (kind === 'Baileys') {
        await addDoc(collection(firestore, 'scripts'), {
          ...baseData,
          sourceCode: cleanSourceCode,
        });
      }

      setSuccess(
        `${kind} berhasil dikirim dan sedang menunggu review admin.`
      );

      setTitle('');
      setThumbnailUrl('');
      setThumbnailFile(null);
      setPreviewImageUrlsText('');
      setPreviewFiles([]);
      setAuthor('');
      setDescription('');
      setLanguage('');
      setSourceCode('');
      setScriptType('');
      setPlatform('');
      setSnippetType('');
      setMediafireUrl('');
      setGithubUrl('');

      window.setTimeout(() => {
        navigate('/dashboard');
      }, 1800);
    } catch (submitError) {
      console.error('UPLOAD_RESOURCE_ERROR:', submitError);

      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Gagal mengirim resource. Silakan coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-32 sm:px-6">
          <div className="glass flex min-h-72 items-center justify-center rounded-3xl">
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <Loader2
                size={18}
                className="animate-spin text-violet-300"
              />
              Memeriksa autentikasi...
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-32 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>

          <div className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0d0d13] p-6 sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.12] blur-[100px]" />

            <div className="relative max-w-xl">
              <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-violet-400/20 bg-violet-400/[0.08] text-violet-200">
                <LockKeyhole size={24} />
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300">
                Authentication required
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Login untuk mulai berbagi.
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-400">
                Kamu perlu login terlebih dahulu untuk mengirim
                resource ke ScriptStationV2. Resource yang dikirim
                akan melewati review admin sebelum dipublikasikan.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Login untuk melanjutkan
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="relative mx-auto w-full max-w-6xl min-w-0 overflow-x-clip px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:pb-24">
        <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-72 w-[min(90%,700px)] -translate-x-1/2 rounded-full bg-violet-500/[0.07] blur-[100px]" />

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-7 inline-flex items-center gap-2 rounded-lg py-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Kembali
        </button>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-10">
          <div className="min-w-0">
            <header className="mb-8">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.17em] text-violet-200">
                  <Sparkles size={12} />
                  {details.eyebrow}
                </span>

                <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Review required
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-violet-200 sm:h-14 sm:w-14">
                  <HeaderIcon size={24} />
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
                    {details.title}
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                    {details.description}
                  </p>
                </div>
              </div>
            </header>

            <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                {
                  icon: FileCode2,
                  title: 'Detail',
                  description: 'Informasi resource',
                },
                {
                  icon: ImagePlus,
                  title: 'Media',
                  description: 'Thumbnail & preview',
                },
                {
                  icon: ShieldCheck,
                  title: 'Review',
                  description: 'Pemeriksaan admin',
                },
              ].map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Icon
                        size={16}
                        className="text-violet-300"
                      />

                      <span className="text-[10px] tabular-nums text-zinc-600">
                        0{index + 1}
                      </span>
                    </div>

                    <p className="truncate text-xs font-semibold text-zinc-200 sm:text-sm">
                      {item.title}
                    </p>

                    <p className="mt-1 hidden text-[11px] leading-5 text-zinc-500 sm:block">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-5">
              <Panel>
                <SectionHeading
                  number="01"
                  title="Informasi dasar"
                  description="Berikan identitas yang jelas untuk resource kamu."
                />

                <div className="space-y-5">
                  <Field
                    label={
                      kind === 'Script'
                        ? 'Nama script'
                        : kind === 'Snippet'
                          ? 'Nama snippet'
                          : 'Nama Baileys'
                    }
                    value={title}
                    onChange={(value) => {
                      setTitle(value);
                      clearMessages();
                    }}
                    placeholder={
                      kind === 'Script'
                        ? 'Contoh: WhatsApp Bot Starter'
                        : kind === 'Snippet'
                          ? 'Contoh: Auto Reply Handler'
                          : 'Contoh: Baileys Message Handler'
                    }
                    required
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Original author"
                      value={author}
                      onChange={setAuthor}
                      placeholder="Nama pembuat asli"
                      hint="Nama author asli, bukan nama akun yang mengunggah."
                    />

                    <div className="min-w-0">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                        Uploaded by
                      </span>

                      <div className="flex min-h-[50px] items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-2.5">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-400/10 text-xs font-semibold text-violet-200">
                            {(user.displayName || user.email || 'U')
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-200">
                            {user.displayName || 'Pengguna'}
                          </p>

                          <p className="truncate text-xs text-zinc-500">
                            {user.email || 'Akun Google'}
                          </p>
                        </div>

                        <CheckCircle2
                          size={15}
                          className="ml-auto shrink-0 text-emerald-300"
                        />
                      </div>
                    </div>
                  </div>

                  <TextArea
                    label="Deskripsi"
                    value={description}
                    onChange={(value) => {
                      setDescription(value);
                      clearMessages();
                    }}
                    placeholder={`Jelaskan fungsi, fitur, dan manfaat ${kind.toLowerCase()} ini...`}
                    required
                    hint="Gunakan deskripsi yang jelas agar pengguna memahami resource sebelum mengunduh atau menggunakan."
                  />
                </div>
              </Panel>

              {kind === 'Script' && (
                <Panel>
                  <SectionHeading
                    number="02"
                    title="Kategori & platform"
                    description="Bantu pengguna menemukan script melalui filter yang sesuai."
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField
                      label="Script type"
                      value={scriptType}
                      onChange={setScriptType}
                      options={SCRIPT_TYPES}
                      required
                    />

                    <SelectField
                      label="Platform"
                      value={platform}
                      onChange={setPlatform}
                      options={PLATFORMS}
                      required
                    />

                    <div className="sm:col-span-2">
                      <SelectField
                        label="Programming language"
                        value={language}
                        onChange={setLanguage}
                        options={LANGUAGES}
                        required
                      />
                    </div>
                  </div>
                </Panel>
              )}

              {kind === 'Snippet' && (
                <Panel>
                  <SectionHeading
                    number="02"
                    title="Kategori snippet"
                    description="Pilih kategori dan bahasa pemrograman yang digunakan."
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField
                      label="Snippet type"
                      value={snippetType}
                      onChange={setSnippetType}
                      options={SNIPPET_TYPES}
                      required
                    />

                    <SelectField
                      label="Programming language"
                      value={language}
                      onChange={setLanguage}
                      options={LANGUAGES}
                      required
                    />
                  </div>
                </Panel>
              )}

              {kind !== 'Baileys' && (
                <Panel>
                  <SectionHeading
                    number={kind === 'Script' ? '03' : '03'}
                    title="Thumbnail & preview"
                    description="Media bersifat opsional, tetapi bisa membantu pengguna memahami resource."
                  />

                  <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_180px]">
                      <div className="min-w-0">
                        <Field
                          label="Thumbnail image URL"
                          value={thumbnailUrl}
                          onChange={(value) => {
                            setThumbnailUrl(value);
                            if (value.trim()) {
                              setThumbnailFile(null);
                            }
                            clearMessages();
                          }}
                          placeholder="https://example.com/thumbnail.png"
                          icon={<Link2 size={16} />}
                          hint="Tempel URL gambar langsung atau pilih gambar dari galeri."
                        />

                        <div className="mt-4">
                          <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.13] bg-black/20 px-4 py-3.5 text-sm text-zinc-400 transition hover:border-violet-400/40 hover:bg-violet-400/[0.04] hover:text-white">
                            <ImagePlus
                              size={17}
                              className="text-violet-300"
                            />
                            <span>
                              {thumbnailFile
                                ? 'Ganti gambar thumbnail'
                                : 'Pilih dari galeri'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                handleThumbnailChange(
                                  event.target.files?.[0] || null
                                );
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>

                          {thumbnailFile && (
                            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                              <span className="min-w-0 truncate text-xs text-zinc-400">
                                {thumbnailFile.name}
                              </span>

                              <button
                                type="button"
                                onClick={() => setThumbnailFile(null)}
                                aria-label="Hapus thumbnail"
                                className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                          Live preview
                        </span>

                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.09] bg-black/30">
                          {activeThumbnail ? (
                            <img
                              src={activeThumbnail}
                              alt="Preview thumbnail"
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.opacity = '0.15';
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-600">
                              <FileImage size={26} />
                              <span className="text-[10px] uppercase tracking-[0.15em]">
                                No image selected
                              </span>
                            </div>
                          )}

                          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                            <p className="truncate text-xs font-medium text-white">
                              {title.trim() || 'Nama resource'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {kind === 'Script' && (
                      <div className="border-t border-white/[0.07] pt-5">
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                          Preview image URLs
                          <span className="ml-2 font-normal normal-case tracking-normal text-zinc-600">
                            Opsional
                          </span>
                        </label>

                        <textarea
                          value={previewImageUrlsText}
                          onChange={(event) => {
                            setPreviewImageUrlsText(event.target.value);
                            clearMessages();
                          }}
                          placeholder={'https://example.com/preview-1.png\nhttps://example.com/preview-2.png'}
                          rows={3}
                          className="w-full resize-y rounded-xl border border-white/[0.09] bg-black/30 p-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/[0.07]"
                        />

                        <div className="mt-4">
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.13] bg-black/20 px-4 py-3.5 text-sm text-zinc-400 transition hover:border-violet-400/40 hover:bg-violet-400/[0.04] hover:text-white">
                            <ImagePlus
                              size={17}
                              className="text-violet-300"
                            />
                            Pilih beberapa gambar preview
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                handlePreviewFilesChange(
                                  Array.from(
                                    event.target.files || []
                                  )
                                );
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>

                          {previewFiles.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {previewFiles.map((file, index) => (
                                <div
                                  key={`${file.name}-${file.size}-${index}`}
                                  className="flex max-w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-black/20 py-1.5 pl-2 pr-1.5"
                                >
                                  <span className="max-w-44 truncate text-xs text-zinc-400">
                                    {file.name}
                                  </span>

                                  <button
                                    type="button"
                                    aria-label={`Hapus ${file.name}`}
                                    onClick={() =>
                                      setPreviewFiles((current) =>
                                        current.filter(
                                          (_, itemIndex) =>
                                            itemIndex !== index
                                        )
                                      )
                                    }
                                    className="rounded-md p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="mt-2 text-xs leading-5 text-zinc-600">
                            Maksimal 5 MB per gambar. Gambar yang
                            dipilih dari galeri akan diunggah melalui
                            endpoint ImgBB yang telah dikonfigurasi.
                          </p>
                        </div>

                        {(previewUrls.length > 0 ||
                          localPreviewUrls.length > 0) && (
                          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {previewUrls.map((url, index) => (
                              <div
                                key={`${url}-${index}`}
                                className="relative aspect-video overflow-hidden rounded-lg border border-white/[0.08] bg-black/30"
                              >
                                <img
                                  src={url}
                                  alt={`Preview ${index + 1}`}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}

                            {localPreviewUrls.map((url, index) => (
                              <div
                                key={`${url}-${index}`}
                                className="relative aspect-video overflow-hidden rounded-lg border border-white/[0.08] bg-black/30"
                              >
                                <img
                                  src={url}
                                  alt={`Gambar preview ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />

                                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-1 text-[9px] text-zinc-300">
                                  Belum diunggah
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Panel>
              )}

              {kind !== 'Script' && (
                <Panel>
                  <SectionHeading
                    number="03"
                    title="Source code"
                    description="Tempelkan kode yang ingin dibagikan kepada komunitas."
                  />

                  <TextArea
                    label="Kode program"
                    value={sourceCode}
                    onChange={(value) => {
                      setSourceCode(value);
                      clearMessages();
                    }}
                    placeholder={
                      kind === 'Snippet'
                        ? 'Tempel snippet kode di sini...'
                        : 'Tempel source code Baileys di sini...'
                    }
                    code
                    required
                  />
                </Panel>
              )}

              {kind === 'Script' && (
                <Panel>
                  <SectionHeading
                    number="04"
                    title="Download link"
                    description="Pilih salah satu penyedia tautan download untuk script kamu."
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGithubUrl('');
                        clearMessages();
                      }}
                      className={`rounded-xl border p-4 text-left transition ${
                        !githubUrl
                          ? 'border-violet-400/30 bg-violet-400/[0.06]'
                          : 'border-white/[0.08] bg-black/20 hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">
                          MediaFire
                        </span>

                        <span
                          className={`grid h-5 w-5 place-items-center rounded-full border ${
                            !githubUrl
                              ? 'border-violet-300 bg-violet-300 text-black'
                              : 'border-white/20 text-transparent'
                          }`}
                        >
                          <Check size={12} />
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                        Link file download dari MediaFire.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMediafireUrl('');
                        clearMessages();
                      }}
                      className={`rounded-xl border p-4 text-left transition ${
                        !mediafireUrl
                          ? 'border-violet-400/30 bg-violet-400/[0.06]'
                          : 'border-white/[0.08] bg-black/20 hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">
                          GitHub
                        </span>

                        <span
                          className={`grid h-5 w-5 place-items-center rounded-full border ${
                            !mediafireUrl
                              ? 'border-violet-300 bg-violet-300 text-black'
                              : 'border-white/20 text-transparent'
                          }`}
                        >
                          <Check size={12} />
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                        Link repository atau resource di GitHub.
                      </p>
                    </button>
                  </div>

                  <div className="mt-5">
                    <Field
                      label={
                        mediafireUrl
                          ? 'MediaFire download URL'
                          : 'GitHub repository URL'
                      }
                      value={
                        mediafireUrl ? mediafireUrl : githubUrl
                      }
                      onChange={(value) => {
                        if (mediafireUrl) {
                          setMediafireUrl(value);
                          setGithubUrl('');
                        } else {
                          setGithubUrl(value);
                          setMediafireUrl('');
                        }

                        clearMessages();
                      }}
                      placeholder={
                        mediafireUrl
                          ? 'https://www.mediafire.com/file/...'
                          : 'https://github.com/username/repository'
                      }
                      icon={<Link2 size={16} />}
                      required
                      hint="Gunakan URL HTTPS resmi dari penyedia yang dipilih."
                    />
                  </div>

                  <Notice>
                    Isi satu tautan saja. Domain tautan akan diperiksa
                    sebelum resource dikirim.
                  </Notice>
                </Panel>
              )}

              {error && (
                <Notice tone="error">
                  <p className="font-medium">{error}</p>
                </Notice>
              )}

              {success && (
                <Notice tone="success">
                  <p className="font-semibold">{success}</p>
                  <p className="mt-1 text-xs text-emerald-200/70">
                    Kamu akan diarahkan ke dashboard...
                  </p>
                </Notice>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 py-3.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft size={16} />
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || Boolean(success)}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Mengirim resource...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 size={17} />
                      Berhasil dikirim
                    </>
                  ) : (
                    <>
                      <UploadCloud size={17} />
                      Kirim untuk review
                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0d0d13] p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-500/[0.10] blur-[60px]" />

              <div className="relative">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08] text-violet-200">
                  <ShieldCheck size={20} />
                </div>

                <h2 className="text-sm font-semibold text-white">
                  Review & keamanan
                </h2>

                <p className="mt-2 text-xs leading-6 text-zinc-500">
                  Resource tidak langsung dipublikasikan. Admin
                  akan memeriksa kiriman sebelum ditampilkan kepada
                  pengguna lain.
                </p>

                <div className="mt-5 space-y-3 border-t border-white/[0.07] pt-4">
                  {[
                    'Data pengunggah tercatat',
                    'Tautan download divalidasi',
                    'Menunggu persetujuan admin',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2.5 text-xs leading-5 text-zinc-400"
                    >
                      <CheckCircle2
                        size={15}
                        className="mt-0.5 shrink-0 text-emerald-300"
                      />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Palette size={16} className="text-violet-300" />

                <h2 className="text-sm font-semibold text-white">
                  Tips publikasi
                </h2>
              </div>

              <div className="space-y-3 text-xs leading-5 text-zinc-500">
                <p>
                  <span className="font-medium text-zinc-300">
                    Nama yang jelas.
                  </span>{' '}
                  Gunakan judul yang menggambarkan fungsi resource.
                </p>

                <p>
                  <span className="font-medium text-zinc-300">
                    Deskripsi lengkap.
                  </span>{' '}
                  Jelaskan fitur, bahasa pemrograman, dan kegunaan.
                </p>

                <p>
                  <span className="font-medium text-zinc-300">
                    Tautan terpercaya.
                  </span>{' '}
                  Pastikan link mengarah ke resource yang benar.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <Monitor
                  size={16}
                  className="mt-0.5 shrink-0 text-zinc-500"
                />

                <p className="text-[11px] leading-5 text-zinc-600">
                  Form ini dirancang agar nyaman digunakan melalui
                  ponsel maupun desktop.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-12 border-t border-white/[0.07] pt-5">
          <div className="flex flex-col gap-2 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <span>ScriptStationV2 · Resource contribution</span>

            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole size={12} />
              Review sebelum publikasi
            </span>
          </div>
        </footer>
      </main>
    </Shell>
  );
}