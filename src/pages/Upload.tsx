import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  ArrowLeft,
  Check,
  Code2,
  ExternalLink,
  FileCode2,
  ImagePlus,
  Link2,
  Loader2,
  UploadCloud,
} from 'lucide-react';

import Shell from '../components/Shell';
import { auth, db } from '../lib/firebase';

type ResourceKind = 'Script' | 'Snippet' | 'Baileys';

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-zinc-500">
        {label}
        {required && (
          <span className="ml-1 text-zinc-300">*</span>
        )}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/8 bg-black/25 px-3 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-white/20"
      />
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  code?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-zinc-500">
        {label}
        {required && (
          <span className="ml-1 text-zinc-300">*</span>
        )}
      </span>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-2xl border border-white/8 bg-black/25 p-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-white/20 ${
          code
            ? 'code h-72 leading-6'
            : 'h-32 leading-6'
        }`}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-zinc-500">
        {label}
        {required && (
          <span className="ml-1 text-zinc-300">*</span>
        )}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/8 bg-black/25 px-3 py-3 text-sm text-white outline-none transition focus:border-white/20"
      >
        <option value="">Select {label}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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

function isAllowedHost(
  value: string,
  hosts: string[]
) {
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

export default function Upload() {
  const navigate = useNavigate();
  const location = useLocation();

  const kind = useMemo(
    () => getKind(location.pathname),
    [location.pathname]
  );

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

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  async function handleSubmit() {
    setError('');
    setSuccess('');

    if (!user) {
      setError(
        'Kamu harus login terlebih dahulu.'
      );
      return;
    }

    if (!db) {
      setError(
        'Firebase Firestore belum terkonfigurasi.'
      );
      return;
    }

    const cleanTitle = title.trim();
    const cleanThumbnail = thumbnailUrl.trim();
    const cleanAuthor = author.trim();
    const cleanDescription = description.trim();
    const cleanLanguage = language.trim();
    const cleanSourceCode = sourceCode.trim();
    const cleanPreviewUrls = previewImageUrlsText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
    const cleanMediaFire = mediafireUrl.trim();
    const cleanGitHub = githubUrl.trim();

    if (!cleanTitle) {
      setError('Nama resource wajib diisi.');
      return;
    }

    if (cleanTitle.length < 3) {
      setError(
        'Nama resource minimal 3 karakter.'
      );
      return;
    }

    if (!cleanDescription) {
      setError('Description wajib diisi.');
      return;
    }

    if (kind !== 'Script' && !cleanSourceCode) {
      setError('Source code wajib diisi.');
      return;
    }

    if (kind !== 'Script' && cleanSourceCode.length > 200000) {
      setError(
        'Source code terlalu besar. Maksimal 200.000 karakter.'
      );
      return;
    }

    if (
      cleanThumbnail &&
      !isValidHttpUrl(cleanThumbnail)
    ) {
      setError(
        'Thumbnail harus berupa URL gambar yang valid.'
      );
      return;
    }

    if (kind === 'Script') {
      if (!cleanMediaFire && !cleanGitHub) {
        setError('Isi minimal satu link download: MediaFire atau GitHub.');
        return;
      }
      if (!scriptType) {
        setError(
          'Script Type wajib dipilih.'
        );
        return;
      }

      if (!platform) {
        setError(
          'Platform wajib dipilih.'
        );
        return;
      }

      if (!cleanLanguage) {
        setError(
          'Programming Language wajib diisi.'
        );
        return;
      }

      if (cleanMediaFire && !isAllowedHost(cleanMediaFire, [
        'mediafire.com', 'www.mediafire.com',
      ])) {
        setError(
          'Link MediaFire tidak valid. Gunakan link MediaFire resmi.'
        );
        return;
      }

      if (cleanGitHub && !isAllowedHost(cleanGitHub, [
        'github.com', 'www.github.com',
      ])) {
        setError(
          'Link GitHub tidak valid. Gunakan link GitHub resmi.'
        );
        return;
      }
    }

    if (kind === 'Script') {
      if (cleanPreviewUrls.some((url) => !isValidHttpUrl(url))) {
        setError('Semua URL preview harus berupa URL HTTP/HTTPS yang valid.');
        return;
      }
      const selectedFiles = [...(thumbnailFile ? [thumbnailFile] : []), ...previewFiles];
      if (selectedFiles.some((file) => !file.type.startsWith('image/'))) {
        setError('File thumbnail/preview harus berupa gambar.');
        return;
      }
      if (selectedFiles.some((file) => file.size > 5 * 1024 * 1024)) {
        setError('Ukuran setiap gambar maksimal 3 MB.');
        return;
      }
    }

    if (kind === 'Snippet') {
      if (!snippetType) {
        setError(
          'Snippet Type wajib dipilih.'
        );
        return;
      }

      if (!cleanLanguage) {
        setError(
          'Programming Language wajib diisi.'
        );
        return;
      }
    }

        setSubmitting(true);

    try {
      const firestore = db;

      let finalThumbnailUrl = cleanThumbnail || '';
      let finalPreviewImageUrls = [...cleanPreviewUrls];

      if (kind === 'Script' && (thumbnailFile || previewFiles.length > 0)) {
        const token = await user.getIdToken();

        const uploadImage = async (file: File): Promise<string> => {
          if (!file.type.startsWith('image/')) {
            throw new Error(`${file.name}: file bukan gambar.`);
          }

          if (file.size > 1024 * 1024) {
            throw new Error(
              `${file.name}: ukuran maksimal 1 MB. Kompres gambar lalu coba lagi.`
            );
          }

          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
              const result = String(reader.result || '');
              const comma = result.indexOf(',');

              if (comma === -1) {
                reject(new Error('Gagal membaca file gambar.'));
              } else {
                resolve(result.slice(comma + 1));
              }
            };

            reader.onerror = () => {
              reject(new Error('Gagal membaca file gambar.'));
            };

            reader.readAsDataURL(file);
          });

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

            const result = await response.json().catch(() => ({}));

            if (!response.ok || typeof result.url !== 'string') {
              throw new Error(
                typeof result.message === 'string'
                  ? result.message
                  : `Upload gambar gagal (HTTP ${response.status}).`
              );
            }

            return result.url;
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              throw new Error(
                'Upload gambar timeout. Coba gambar lebih kecil.'
              );
            }

            throw error;
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

        thumbnailUrl:
          finalThumbnailUrl || null,

        description: cleanDescription,

        author:
          cleanAuthor ||
          user.displayName ||
          'Anonymous',

        ownerId: user.uid,

        ownerName:
          user.displayName ||
          'Anonymous',

        ownerEmail:
          user.email || null,


        status: 'pending',

        views: 0,

        downloads: 0,

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),
      };

      if (kind === 'Script') {
        await addDoc(
          collection(firestore, 'scripts'),
          {
            ...baseData,

            scriptType,

            platform,

            language: cleanLanguage,

            mediafireUrl:
              cleanMediaFire,

            githubUrl:
              cleanGitHub || null,
            previewImageUrls: finalPreviewImageUrls,
          }
        );
      }

      if (kind === 'Snippet') {
        await addDoc(
          collection(firestore, 'scripts'),
          {
            ...baseData,

            snippetType,

            language: cleanLanguage,
            sourceCode: cleanSourceCode,
          }
        );
      }

      if (kind === 'Baileys') {
        await addDoc(
          collection(firestore, 'scripts'),
          {
            ...baseData,
            sourceCode: cleanSourceCode,
          }
        );
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
    } catch (err) {
      console.error(
        'UPLOAD_RESOURCE_ERROR:',
        err
      );

      setError(
        'Gagal mengirim resource. Silakan coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto max-w-4xl px-4 pb-12 pt-32 sm:px-6">
          <div className="glass flex min-h-64 items-center justify-center rounded-3xl">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Checking authentication...
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <main className="mx-auto max-w-4xl px-4 pb-12 pt-32 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
            Create
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Upload {kind}
          </h1>

          <div className="glass mt-8 rounded-3xl p-6 sm:p-8">
            <p className="text-zinc-400">
              Kamu harus login terlebih dahulu untuk
              mengupload resource.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
            >
              Login with Google
            </button>
          </div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="mx-auto w-full max-w-5xl min-w-0 px-4 pb-16 pt-32 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/8 bg-white/5">
              {kind === 'Script' && (
                <FileCode2
                  size={20}
                  className="text-zinc-300"
                />
              )}

              {kind === 'Snippet' && (
                <Code2
                  size={20}
                  className="text-zinc-300"
                />
              )}

              {kind === 'Baileys' && (
                <UploadCloud
                  size={20}
                  className="text-zinc-300"
                />
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
                Create Resource
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                Upload {kind}
              </h1>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Bagikan {kind.toLowerCase()} kepada komunitas
            ScriptStationV2. Resource akan diperiksa admin
            sebelum tampil secara publik.
          </p>
        </div>

        <div className="glass mt-8 rounded-3xl p-5 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">

            <div className="sm:col-span-2">
              <Field
                label={
                  kind === 'Script'
                    ? 'Script Name'
                    : kind === 'Snippet'
                      ? 'Snippet Name'
                      : 'Baileys Name'
                }
                value={title}
                onChange={setTitle}
                placeholder={
                  kind === 'Script'
                    ? 'Contoh: WhatsApp Bot Starter'
                    : kind === 'Snippet'
                      ? 'Contoh: Auto Reply Handler'
                      : 'Contoh: Baileys Message Handler'
                }
                required
              />
            </div>

            {kind !== 'Baileys' && (
              <div className="sm:col-span-2">
                <label className="block">
                  <span className="mb-2 block text-xs text-zinc-500">
                    Thumbnail URL
                    <span className="ml-1 text-zinc-600">
                      (optional)
                    </span>
                  </span>

                  <div className="relative">
                    <ImagePlus
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                    />

                    <input
                      value={thumbnailUrl}
                      onChange={(e) =>
                        setThumbnailUrl(e.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-2xl border border-white/8 bg-black/25 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20"
                    />
                  </div>

                  {kind === 'Script' && (
                    <div className="mt-3">
                      <span className="mb-2 block text-xs text-zinc-500">Atau pilih thumbnail dari galeri (maks. 3 MB)</span>
                      <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-white" />
                      {thumbnailFile && <p className="mt-1 text-xs text-zinc-400">Dipilih: {thumbnailFile.name}</p>}
                    </div>
                  )}
                </label>
              </div>
            )}

            {kind === 'Script' && (
              <div className="sm:col-span-2 rounded-2xl border border-white/8 bg-black/15 p-4">
                <label className="block">
                  <span className="mb-2 block text-xs text-zinc-500">Preview Image URLs (optional, pisahkan dengan baris baru)</span>
                  <textarea value={previewImageUrlsText} onChange={(e) => setPreviewImageUrlsText(e.target.value)} placeholder="https://.../preview.png" className="w-full rounded-xl border border-white/8 bg-black/25 p-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/20" rows={2} />
                </label>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs text-zinc-500">Atau pilih beberapa preview dari galeri (maks. 3 MB/gambar)</span>
                  <input type="file" accept="image/*" multiple onChange={(e) => setPreviewFiles(Array.from(e.target.files || []))} className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-white" />
                  {previewFiles.length > 0 && <p className="mt-2 text-xs text-zinc-400">{previewFiles.length} gambar dipilih</p>}
                </label>
              </div>
            )}

            <Field
              label="Original Author"
              value={author}
              onChange={setAuthor}
              placeholder="Nama author asli"
            />

            <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5">
                  <Check
                    size={17}
                    className="text-zinc-400"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-zinc-600">
                    Uploaded by
                  </p>

                  <p className="truncate text-sm font-medium text-zinc-200">
                    {user.displayName ||
                      user.email ||
                      'Anonymous'}
                  </p>
                </div>
              </div>
            </div>

            {kind === 'Script' && (
              <>
                <SelectField
                  label="Script Type"
                  value={scriptType}
                  onChange={setScriptType}
                  options={[
                    'Full Case',
                    'Full Plugins',
                    'Plugins + Case',
                  ]}
                  required
                />

                <SelectField
                  label="Platform"
                  value={platform}
                  onChange={setPlatform}
                  options={[
                    'WhatsApp Bot',
                    'Telegram Bot',
                    'Discord Bot',
                    'Website',
                  ]}
                  required
                />

                <div className="sm:col-span-2">
                  <Field
                    label="Programming Language"
                    value={language}
                    onChange={setLanguage}
                    placeholder="JavaScript, TypeScript, Python, PHP..."
                    required
                  />
                </div>
              </>
            )}

            {kind === 'Snippet' && (
              <>
                <SelectField
                  label="Snippet Type"
                  value={snippetType}
                  onChange={setSnippetType}
                  options={[
                    'Case',
                    'Plugin',
                    'Function',
                    'Utility',
                    'Config',
                    'Other',
                  ]}
                  required
                />

                <Field
                  label="Programming Language"
                  value={language}
                  onChange={setLanguage}
                  placeholder="JavaScript, TypeScript, Python, PHP..."
                  required
                />
              </>
            )}

            <div className="sm:col-span-2">
              <TextArea
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder={`Jelaskan ${kind.toLowerCase()} ini, fungsi, fitur, atau cara kerjanya...`}
                required
              />
            </div>

            {kind === 'Script' && (
              <>
                <div className="sm:col-span-2">
                  <Field
                    label="MediaFire Download URL"
                    value={mediafireUrl}
                    onChange={setMediafireUrl}
                    placeholder="https://www.mediafire.com/... (optional)"
                  />

                  <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-700">
                    <Link2 size={12} />
                    Opsional; jika diisi harus menggunakan domain MediaFire.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <Field
                    label="GitHub Repository URL"
                    value={githubUrl}
                    onChange={setGithubUrl}
                    placeholder="https://github.com/username/repository (optional)"
                  />

                  <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-700">
                    <ExternalLink size={12} />
                    Opsional; jika diisi harus menggunakan domain GitHub.
                  </p>
                </div>
              </>
            )}

            {kind !== 'Script' && (
              <div className="sm:col-span-2">
                <TextArea label="Source Code" value={sourceCode} onChange={setSourceCode} placeholder="Paste your source code here..." code required />
                <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-700"><Code2 size={12} />Maksimal 200.000 karakter.</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-6 text-emerald-300">
              <Check
                size={18}
                className="mt-0.5 shrink-0"
              />
              {success}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={submitting}
              className="rounded-xl border border-white/8 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Submitting...
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  Submit for Review
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/6 bg-white/[.02] p-4">
          <ExternalLink
            size={16}
            className="mt-0.5 shrink-0 text-zinc-600"
          />

          <p className="text-xs leading-5 text-zinc-600">
            Setelah dikirim, resource berstatus{' '}
            <span className="text-zinc-400">
              pending
            </span>{' '}
            dan tidak akan tampil di halaman publik
            sampai disetujui admin.
          </p>
        </div>
      </main>
    </Shell>
  );
}