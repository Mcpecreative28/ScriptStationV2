import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  doc,
  getDoc,
} from 'firebase/firestore';

import Shell from '../components/Shell';
import { db } from '../lib/firebase';
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

  if (!Number.isFinite(number)) {
    return '0';
  }

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

  const [resource, setResource] =
    useState<Resource | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [copied, setCopied] =
    useState(false);

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

        const snapshot = await getDoc(
          doc(db, 'scripts', id)
        );

        if (!snapshot.exists()) {
          if (active) {
            setError('Resource tidak ditemukan.');
          }

          return;
        }

        const data = snapshot.data();

        // Public detail hanya boleh menampilkan
        // resource yang sudah approved.
        if (data.status !== 'approved') {
          if (active) {
            setError(
              'Resource ini belum tersedia untuk publik.'
            );
          }

          return;
        }

        const kind = getKind(
          data.resourceType ?? data.category
        );

        const mapped: Resource = {
          id: snapshot.id,

          kind,

          title:
            data.title ?? 'Untitled',

          description:
            data.description ?? '',

          desc:
            data.description ?? '',

          category:
            data.category ??
            data.platform ??
            data.scriptType ??
            '',

          tags: Array.isArray(data.tags)
            ? data.tags
            : [],

          thumbnailUrl:
            data.thumbnailUrl ?? null,

          author:
            data.author ?? 'Unknown',

          uploaderName:
            data.ownerName ?? '',

          uploaderEmail:
            data.ownerEmail ?? '',

          ownerId:
            data.ownerId ?? '',

          language:
            data.language ?? '',

          sourceCode:
            data.sourceCode ?? '',

          scriptType:
            data.scriptType,

          platform:
            data.platform,

          snippetType:
            data.snippetType,

          mediafireUrl:
            data.mediafireUrl ?? null,

          githubUrl:
            data.githubUrl ?? null,

          rating:
            Number(data.rating ?? 0),

          downloads:
            Number(data.downloads ?? 0),

          views:
            Number(data.views ?? 0),

          status:
            data.status,

          createdAt:
            data.createdAt,

          updatedAt:
            data.updatedAt,
        };

        if (active) {
          setResource(mapped);
        }
      } catch (err) {
        console.error(
          'RESOURCE_DETAIL_ERROR:',
          err
        );

        if (active) {
          setError(
            'Gagal memuat resource.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadResource();

    return () => {
      active = false;
    };
  }, [id]);

  async function copyCode() {
    if (!resource?.sourceCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        resource.sourceCode
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setError(
        'Gagal menyalin kode. Silakan coba manual.'
      );
    }
  }

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto max-w-5xl px-4 pb-12 pt-32 sm:px-6">
          <div className="glass flex min-h-64 items-center justify-center rounded-3xl">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading resource...
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  if (error || !resource) {
    return (
      <Shell>
        <main className="mx-auto max-w-5xl px-4 pb-12 pt-32 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="glass mt-5 rounded-3xl p-8 text-center">
            <Code2
              size={32}
              className="mx-auto text-zinc-600"
            />

            <h1 className="mt-4 text-xl font-semibold">
              Resource tidak tersedia
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              {error ||
                'Resource yang kamu cari tidak ditemukan.'}
            </p>
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

  const mediafireValid =
    isAllowedUrl(
      resource.mediafireUrl,
      [
        'mediafire.com',
        'www.mediafire.com',
      ]
    );

  const githubValid =
    isAllowedUrl(
      resource.githubUrl,
      [
        'github.com',
        'www.github.com',
      ]
    );

  return (
    <Shell>
      <main className="mx-auto w-full max-w-6xl min-w-0 px-4 pb-16 pt-32 sm:px-6">
        {/* Back */}
        <Link
          to={backPath}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to {resource.kind}
        </Link>

        {/* Hero */}
        <section className="glass mt-5 overflow-hidden rounded-3xl">
          {resource.thumbnailUrl && (
            <div className="relative aspect-[21/8] max-h-[360px] overflow-hidden bg-black/30">
              <img
                src={resource.thumbnailUrl}
                alt={`${resource.title} thumbnail`}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 sm:bottom-6 sm:left-6 sm:right-6">
                <span className="rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-md">
                  {resource.kind}
                </span>

                {resource.language && (
                  <span className="rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur-md">
                    {resource.language}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="min-w-0 p-5 sm:p-8">
            {!resource.thumbnailUrl && (
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-xl border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
                  {resource.kind}
                </span>

                {resource.language && (
                  <span className="rounded-xl border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-zinc-400">
                    {resource.language}
                  </span>
                )}
              </div>
            )}

            <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-5xl">
              {resource.title}
            </h1>

            <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-zinc-500 sm:text-base">
              {resource.description}
            </p>

            {/* Author / uploader */}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/6 bg-white/[.025] p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/6 text-zinc-500">
                    <UserRound size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-zinc-600">
                      Original author
                    </p>

                    <p className="truncate text-sm font-medium text-zinc-200">
                      {resource.author ||
                        'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/6 bg-white/[.025] p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/6 text-zinc-500">
                    <UserRound size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-zinc-600">
                      Uploaded by
                    </p>

                    <p className="truncate text-sm font-medium text-zinc-200">
                      {resource.uploaderName ||
                        'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Extra metadata */}
            <div className="mt-4 flex flex-wrap gap-2">
              {resource.scriptType && (
                <span className="rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-400">
                  Type: {resource.scriptType}
                </span>
              )}

              {resource.platform && (
                <span className="rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-400">
                  Platform: {resource.platform}
                </span>
              )}

              {resource.snippetType && (
                <span className="rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-400">
                  Type: {resource.snippetType}
                </span>
              )}

              {resource.language && (
                <span className="rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-400">
                  Language: {resource.language}
                </span>
              )}

              <span className="rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-500">
                <Download
                  size={13}
                  className="mr-1 inline"
                />
                {formatNumber(resource.downloads)}
              </span>

              <span className="rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-500">
                {formatNumber(resource.views)} views
              </span>
            </div>
          </div>
        </section>

        {/* External links */}
        {(mediafireValid ||
          githubValid) && (
          <section className="mt-5 glass rounded-3xl p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-zinc-200">
              Download & Links
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {mediafireValid && (
                <a
                  href={resource.mediafireUrl!}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-black">
                      <Download size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-white">
                        MediaFire
                      </p>

                      <p className="text-xs text-zinc-500">
                        Download resource
                      </p>
                    </div>
                  </div>

                  <ExternalLink
                    size={16}
                    className="text-zinc-500 transition group-hover:text-white"
                  />
                </a>
              )}

              {githubValid && (
                <a
                  href={resource.githubUrl!}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-black">
                      <Code2 size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-white">
                        GitHub
                      </p>

                      <p className="text-xs text-zinc-500">
                        View source repository
                      </p>
                    </div>
                  </div>

                  <ExternalLink
                    size={16}
                    className="text-zinc-500 transition group-hover:text-white"
                  />
                </a>
              )}
            </div>
          </section>
        )}

        {/* Code */}
        <section className="mt-5 glass min-w-0 overflow-hidden rounded-3xl">
          <div className="flex flex-col gap-3 border-b border-white/6 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <div className="flex items-center gap-2">
                <Code2 size={17} className="text-zinc-400" />

                <h2 className="text-sm font-semibold text-zinc-200">
                  Source Code
                </h2>
              </div>

              <p className="mt-1 text-xs text-zinc-600">
                Raw source code provided by the uploader.
              </p>
            </div>

            <button
              type="button"
              onClick={copyCode}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white sm:w-auto"
            >
              {copied ? (
                <>
                  <Check size={15} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={15} />
                  Copy Code
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <pre className="code min-w-0 p-5 text-xs leading-6 text-zinc-400 sm:p-6">
              <code>
                {resource.sourceCode ||
                  '// No source code provided.'}
              </code>
            </pre>
          </div>
        </section>
      </main>
    </Shell>
  );
}