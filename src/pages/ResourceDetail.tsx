
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  doc,
  getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import Shell from '../components/Shell';
import { auth, db } from '../lib/firebase';
import type { Resource } from '../data/mock';

function getKind(value: unknown): Resource['kind'] {
  return value === 'Snippet'
    ? 'Snippet'
    : value === 'Baileys'
      ? 'Baileys'
      : 'Script';
}

function isAllowedUrl(
  value: string | null | undefined,
  hosts: string[]
) {
  if (!value) return false;

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

function formatNumber(value: unknown) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) return '0';

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }

  return String(number);
}

export default function ResourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');

  const [activePreview, setActivePreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadResource() {
      if (!db || !id) {
        if (active) {
          setError('Resource tidak ditemukan.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError('');
        setResource(null);

        const snapshot = await getDoc(doc(db, 'scripts', id));

        if (!active) return;

        if (!snapshot.exists()) {
          setError('Resource tidak ditemukan.');
          return;
        }

        const data = snapshot.data();

        if (data.status !== 'approved') {
          setError('Resource ini belum tersedia untuk publik.');
          return;
        }

        const kind = getKind(data.resourceType ?? data.category);

        const mapped: Resource = {
          id: snapshot.id,
          kind,
          title: data.title ?? 'Untitled',
          description: data.description ?? '',
          desc: data.description ?? '',
          category:
            data.category ??
            data.platform ??
            data.scriptType ??
            '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          thumbnailUrl: data.thumbnailUrl ?? null,
          author: data.author ?? 'Unknown',
          uploaderName: data.ownerName ?? '',
          uploaderEmail: data.ownerEmail ?? '',
          ownerId: data.ownerId ?? '',
          language: data.language ?? '',
          sourceCode: data.sourceCode ?? undefined,
          previewImageUrls: Array.isArray(data.previewImageUrls)
            ? data.previewImageUrls.filter(
                (url: unknown): url is string => typeof url === 'string'
              )
            : [],
          scriptType: data.scriptType,
          platform: data.platform,
          snippetType: data.snippetType,
          mediafireUrl: data.mediafireUrl ?? null,
          githubUrl: data.githubUrl ?? null,
          rating: Number(data.rating ?? 0),
          downloads: Number(data.downloads ?? 0),
          views: Number(data.views ?? 0),
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };

        setResource(mapped);
      } catch (err) {
        console.error('RESOURCE_DETAIL_ERROR:', err);

        if (active) {
          setError('Gagal memuat resource. Silakan coba lagi.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadResource();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!auth || !id || resource?.id !== id || resource.status !== 'approved') {
      return;
    }

    let active = true;
    let tracked = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active || tracked || !user) return;

      tracked = true;

      try {
        const token = await user.getIdToken();

        if (!active) return;

        const response = await fetch('/api/resource-view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ resourceId: id }),
        });

        if (!response.ok) {
          console.warn('View tracking gagal:', response.status);
          return;
        }

        const result = await response.json();

        if (active && result.counted) {
          setResource((current) => {
            if (!current || current.id !== id) return current;

            return {
              ...current,
              views: Number(current.views ?? 0) + 1,
            };
          });
        }
      } catch (err) {
        console.warn('View tracking error:', err);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [id, resource?.id, resource?.status]);

  async function trackDownload() {
    const user = auth?.currentUser;

    if (!user || !id || resource?.status !== 'approved') return;

    try {
      const token = await user.getIdToken();

      const response = await fetch('/api/resource-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resourceId: id }),
      });

      if (!response.ok) {
        const message = await response.text();

        console.error('Download tracking gagal:', {
          status: response.status,
          message,
        });

        return;
      }

      const result = await response.json();

      if (result.counted) {
        setResource((current) => {
          if (!current || current.id !== id) return current;

          return {
            ...current,
            downloads: Number(current.downloads ?? 0) + 1,
          };
        });
      }
    } catch (err) {
      console.warn('Download tracking error:', err);
    }
  }

  async function submitRating() {
    const user = auth?.currentUser;

    if (!user) {
      setRatingMessage(
        'Login dengan Google terlebih dahulu untuk memberi rating.'
      );
      return;
    }

    if (!id || resource?.status !== 'approved') {
      setRatingMessage('Resource tidak tersedia untuk diberi rating.');
      return;
    }

    if (selectedRating < 1 || selectedRating > 5) {
      setRatingMessage('Pilih 1 sampai 5 bintang terlebih dahulu.');
      return;
    }

    setSubmittingRating(true);
    setRatingMessage('');

    try {
      const token = await user.getIdToken();

      const response = await fetch('/api/resource-rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resourceId: id,
          rating: selectedRating,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Rating gagal disimpan.');
      }

      setResource((current) => {
        if (!current || current.id !== id) return current;

        return {
          ...current,
          rating: Number(result.averageRating ?? current.rating ?? 0),
        };
      });

      setRatingMessage('Rating berhasil disimpan.');
    } catch (err) {
      console.error('RATING_ERROR:', err);

      setRatingMessage(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat menyimpan rating.'
      );
    } finally {
      setSubmittingRating(false);
    }
  }

  async function copyCode() {
    if (!resource?.sourceCode) return;

    try {
      await navigator.clipboard.writeText(resource.sourceCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Gagal menyalin kode. Silakan coba salin secara manual.');
    }
  }

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-32 sm:px-6">
          <div className="glass relative flex min-h-80 flex-col items-center justify-center overflow-hidden rounded-3xl">
            <div className="pointer-events-none absolute h-48 w-48 rounded-full bg-violet-500/[.08] blur-[80px]" />

            <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/[.09] bg-white/[.04]">
              <Loader2 size={23} className="animate-spin text-zinc-300" />
            </div>

            <p className="mt-5 text-sm font-medium text-zinc-300">
              Loading resource
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              Mengambil detail resource...
            </p>
          </div>
        </main>
      </Shell>
    );
  }

  if (error || !resource) {
    return (
      <Shell>
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-32 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-zinc-400 transition hover:bg-white/[.05] hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="glass relative mt-5 overflow-hidden rounded-3xl px-5 py-14 text-center sm:px-10">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-red-400/[.05] blur-[70px]" />

            <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/[.09] bg-white/[.035] text-zinc-400">
              <Code2 size={24} />
            </div>

            <h1 className="relative mt-5 text-xl font-semibold tracking-tight text-white">
              Resource tidak tersedia
            </h1>

            <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {error || 'Resource yang kamu cari tidak ditemukan.'}
            </p>

            <Link
              to="/"
              className="relative mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              <ArrowLeft size={15} />
              Kembali ke beranda
            </Link>
          </div>
        </main>
      </Shell>
    );
  }

  const backPath =
    resource.kind === 'Snippet'
      ? '/snippets'
      : resource.kind === 'Baileys'
        ? '/baileys'
        : '/scripts';

  const mediafireValid = isAllowedUrl(resource.mediafireUrl, [
    'mediafire.com',
    'www.mediafire.com',
  ]);

  const githubValid = isAllowedUrl(resource.githubUrl, [
    'github.com',
    'www.github.com',
  ]);

  const previewImages = (resource.previewImageUrls ?? []).filter(
    (url) => isAllowedUrl(url, [
      new URL(url).hostname.toLowerCase(),
    ])
  );

  const hasSourceCode = Boolean(resource.sourceCode?.trim());

  return (
    <Shell>
      <main className="relative mx-auto w-full max-w-6xl min-w-0 overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
        <div className="pointer-events-none absolute right-[-8rem] top-20 h-72 w-72 rounded-full bg-violet-500/[.06] blur-[100px]" />
        <div className="pointer-events-none absolute left-[-9rem] top-[34rem] h-72 w-72 rounded-full bg-sky-500/[.04] blur-[100px]" />

        <Link
          to={backPath}
          className="group relative inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-zinc-500 transition hover:bg-white/[.04] hover:text-white"
        >
          <ArrowLeft
            size={16}
            className="transition-transform duration-200 group-hover:-translate-x-1"
          />
          Back to {resource.kind}
        </Link>

        <section className="glass relative mt-4 overflow-hidden rounded-3xl">
          {resource.thumbnailUrl && (
            <div className="group relative aspect-[16/7] max-h-[420px] min-h-48 overflow-hidden bg-black/30 sm:aspect-[21/8]">
              <img
                src={resource.thumbnailUrl}
                alt={`${resource.title} thumbnail`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-black/25 to-black/5" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 sm:bottom-6 sm:left-7 sm:right-7">
                <span className="rounded-xl border border-white/[.14] bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xl">
                  {resource.kind}
                </span>

                {resource.language && (
                  <span className="rounded-xl border border-white/[.12] bg-black/45 px-3 py-1.5 text-xs text-zinc-200 backdrop-blur-xl">
                    {resource.language}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/[.15] bg-black/45 px-3 py-1.5 text-xs text-emerald-200 backdrop-blur-xl">
                  <ShieldCheck size={13} />
                  Approved
                </span>
              </div>
            </div>
          )}

          <div className="min-w-0 p-5 sm:p-8 lg:p-9">
            {!resource.thumbnailUrl && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="rounded-xl border border-white/[.09] bg-white/[.04] px-3 py-1.5 text-xs text-zinc-300">
                  {resource.kind}
                </span>

                {resource.language && (
                  <span className="rounded-xl border border-white/[.09] bg-white/[.04] px-3 py-1.5 text-xs text-zinc-400">
                    {resource.language}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/[.12] bg-emerald-300/[.04] px-3 py-1.5 text-xs text-emerald-300">
                  <ShieldCheck size={13} />
                  Approved
                </span>
              </div>
            )}

            <h1 className="break-words text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl lg:text-5xl">
              {resource.title}
            </h1>

            {resource.description && (
              <p className="mt-4 max-w-3xl whitespace-pre-wrap break-words text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8">
                {resource.description}
              </p>
            )}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="group rounded-2xl border border-white/[.07] bg-white/[.025] p-4 transition-colors duration-200 hover:border-white/[.12] hover:bg-white/[.04]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.04] text-zinc-400 transition group-hover:text-white">
                    <UserRound size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-zinc-600">
                      Original author
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-zinc-200">
                      {resource.author || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="group rounded-2xl border border-white/[.07] bg-white/[.025] p-4 transition-colors duration-200 hover:border-white/[.12] hover:bg-white/[.04]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.04] text-zinc-400 transition group-hover:text-white">
                    <UserRound size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-zinc-600">
                      Uploaded by
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-zinc-200">
                      {resource.uploaderName || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {resource.scriptType && (
                <span className="rounded-xl border border-white/[.06] bg-white/[.035] px-3 py-2 text-xs text-zinc-400">
                  Type: {resource.scriptType}
                </span>
              )}

              {resource.platform && (
                <span className="rounded-xl border border-white/[.06] bg-white/[.035] px-3 py-2 text-xs text-zinc-400">
                  Platform: {resource.platform}
                </span>
              )}

              {resource.snippetType && (
                <span className="rounded-xl border border-white/[.06] bg-white/[.035] px-3 py-2 text-xs text-zinc-400">
                  Type: {resource.snippetType}
                </span>
              )}

              {resource.language && (
                <span className="rounded-xl border border-white/[.06] bg-white/[.035] px-3 py-2 text-xs text-zinc-400">
                  Language: {resource.language}
                </span>
              )}

              {(resource.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-xl border border-white/[.06] bg-white/[.025] px-3 py-2 text-xs text-zinc-500"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-white/[.07] bg-black/15 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Star size={14} className="text-amber-300" />
                  <span className="text-[10px] sm:text-xs">Rating</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-white sm:text-xl">
                  {Number(resource.rating ?? 0).toFixed(1)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[.07] bg-black/15 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Download size={14} />
                  <span className="text-[10px] sm:text-xs">Downloads</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-white sm:text-xl">
                  {formatNumber(resource.downloads)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[.07] bg-black/15 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Eye size={14} />
                  <span className="text-[10px] sm:text-xs">Views</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-white sm:text-xl">
                  {formatNumber(resource.views)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {(mediafireValid || githubValid) && (
          <section className="glass relative mt-5 overflow-hidden rounded-3xl p-5 sm:p-7">
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-sky-400/[.04] blur-[60px]" />

            <div className="relative">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-white/[.04] text-zinc-300">
                  <Download size={18} />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-white">
                    Download & Links
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Pilih sumber resmi yang disediakan oleh uploader.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {mediafireValid && (
                  <a
                    href={resource.mediafireUrl!}
                    onClick={() => void trackDownload()}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/[.08] bg-white/[.025] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[.17] hover:bg-white/[.055]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-black transition-transform duration-200 group-hover:scale-105">
                        <Download size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          MediaFire
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Download resource
                        </p>
                      </div>
                    </div>

                    <ExternalLink
                      size={16}
                      className="shrink-0 text-zinc-500 transition-colors group-hover:text-white"
                    />
                  </a>
                )}

                {githubValid && (
                  <a
                    href={resource.githubUrl!}
                    onClick={() => void trackDownload()}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/[.08] bg-white/[.025] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[.17] hover:bg-white/[.055]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-black transition-transform duration-200 group-hover:scale-105">
                        <Code2 size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          GitHub
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          View source repository
                        </p>
                      </div>
                    </div>

                    <ExternalLink
                      size={16}
                      className="shrink-0 text-zinc-500 transition-colors group-hover:text-white"
                    />
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="glass relative mt-5 overflow-hidden rounded-3xl p-5 sm:p-7">
          <div className="pointer-events-none absolute right-[-2rem] top-[-3rem] h-40 w-40 rounded-full bg-amber-300/[.05] blur-[70px]" />

          <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-amber-300/[.12] bg-amber-300/[.05]">
                  <Star size={17} className="text-amber-300" />
                </div>

                <h2 className="text-base font-semibold text-white">
                  Rate this resource
                </h2>
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Bagikan penilaianmu untuk membantu pengguna lain.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-2xl border border-white/[.08] bg-black/20 px-4 py-3 sm:self-auto">
              <Star size={19} className="fill-amber-300 text-amber-300" />
              <span className="text-xl font-semibold text-white">
                {Number(resource.rating ?? 0).toFixed(1)}
              </span>
              <span className="text-xs text-zinc-600">/ 5</span>
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Beri rating ${value} bintang`}
                aria-pressed={selectedRating === value}
                disabled={submittingRating}
                onClick={() => {
                  setSelectedRating(value);
                  setRatingMessage('');
                }}
                className={`grid h-12 w-12 place-items-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                  value <= selectedRating
                    ? 'border-amber-300/30 bg-amber-300/[.1]'
                    : 'border-white/[.08] bg-white/[.025] hover:border-white/[.16] hover:bg-white/[.05]'
                }`}
              >
                <Star
                  size={21}
                  className={`transition-colors ${
                    value <= selectedRating
                      ? 'fill-amber-300 text-amber-300'
                      : 'text-zinc-600'
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void submitRating()}
            disabled={submittingRating || selectedRating === 0}
            className="relative mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {submittingRating && (
              <Loader2 size={16} className="animate-spin" />
            )}
            {submittingRating ? 'Menyimpan rating...' : 'Kirim rating'}
          </button>

          {ratingMessage && (
            <p
              role="status"
              className={`relative mt-3 text-sm ${
                ratingMessage.toLowerCase().includes('berhasil')
                  ? 'text-emerald-300'
                  : 'text-zinc-400'
              }`}
            >
              {ratingMessage}
            </p>
          )}
        </section>

        {resource.kind !== 'Script' && (
          <section className="glass mt-5 min-w-0 overflow-hidden rounded-3xl">
            <div className="flex flex-col gap-4 border-b border-white/[.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-white/[.04] text-zinc-300">
                  <Code2 size={18} />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-white">
                    Source Code
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Source code yang disediakan oleh uploader.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void copyCode()}
                disabled={!hasSourceCode}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[.09] bg-white/[.04] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy code'}
              </button>
            </div>

            <div className="min-w-0 overflow-x-auto bg-black/15">
              <pre className="code min-w-0 p-5 text-xs leading-6 text-zinc-400 sm:p-6">
                <code>
                  {resource.sourceCode || 'No source code provided.'}
                </code>
              </pre>
            </div>
          </section>
        )}

        {resource.kind === 'Script' && previewImages.length > 0 && (
          <section className="glass mt-5 overflow-hidden rounded-3xl p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.04] text-zinc-300">
                <ImageIcon size={18} />
              </div>

              <div>
                <h2 className="text-base font-semibold text-white">
                  Preview gallery
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {previewImages.length} gambar preview
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {previewImages.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setActivePreview(url)}
                  className="group relative block min-w-0 overflow-hidden rounded-2xl border border-white/[.08] bg-black/20 text-left transition hover:border-white/[.18]"
                >
                  <img
                    src={url}
                    alt={`${resource.title} preview ${index + 1}`}
                    loading="lazy"
                    className="max-h-[420px] min-h-36 w-full object-contain transition-transform duration-300 group-hover:scale-[1.015]"
                  />

                  <span className="absolute bottom-3 right-3 rounded-lg border border-white/[.12] bg-black/65 px-2.5 py-1.5 text-[10px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                    View image
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {activePreview && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Preview image"
            onClick={() => setActivePreview(null)}
          >
            <button
              type="button"
              aria-label="Close image preview"
              onClick={() => setActivePreview(null)}
              className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-xl border border-white/[.12] bg-black/50 text-white transition hover:bg-white/[.1] sm:right-6 sm:top-6"
            >
              <X size={20} />
            </button>

            <img
              src={activePreview}
              alt={`${resource.title} enlarged preview`}
              className="max-h-[88vh] max-w-full rounded-xl object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}
      </main>
    </Shell>
  );
}