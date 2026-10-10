import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Code2,
  Download,
  Eye,
  Star,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Resource } from '../data/mock';

function getDetailPath(resource: Resource) {
  const base =
    resource.kind === 'Snippet'
      ? '/snippets'
      : resource.kind === 'Baileys'
        ? '/baileys'
        : '/scripts';

  return `${base}/${resource.id}`;
}

function formatNumber(value: number | string | undefined) {
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

export default function ResourceCard({
  r,
}: {
  r: Resource;
}) {
  const detailPath = getDetailPath(r);

  return (
    <motion.article
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="glass group min-w-0 overflow-hidden rounded-3xl"
    >
      {/* Thumbnail */}
      <Link
        to={detailPath}
        aria-label={`Open ${r.title}`}
        className="block"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-white/10 via-white/[.04] to-transparent">
          {r.thumbnailUrl ? (
            <img
              src={r.thumbnailUrl}
              alt={`${r.title} thumbnail`}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="absolute h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />

              <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-black/30 text-zinc-400">
                <Code2 size={28} strokeWidth={1.5} />
              </div>
            </div>
          )}

          {/* top badges */}
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap gap-2">
            <span className="rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur-md">
              {r.kind}
            </span>

            {r.language && (
              <span className="rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] text-zinc-400 backdrop-blur-md">
                {r.language}
              </span>
            )}
          </div>

          {/* arrow */}
          <div className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/55 text-zinc-300 backdrop-blur-md transition group-hover:bg-white group-hover:text-black">
            <ArrowUpRight size={17} />
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="min-w-0 p-4">
        <div className="min-w-0">
          <Link to={detailPath}>
            <h3 className="truncate text-base font-semibold tracking-tight text-white transition hover:text-zinc-300">
              {r.title}
            </h3>
          </Link>

          <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-zinc-500">
            {r.description || r.desc || 'No description provided.'}
          </p>
        </div>

        {/* Script / Snippet metadata */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.scriptType && (
            <span className="rounded-md border border-white/6 bg-white/4 px-2 py-1 text-[10px] text-zinc-400">
              {r.scriptType}
            </span>
          )}

          {r.platform && (
            <span className="rounded-md border border-white/6 bg-white/4 px-2 py-1 text-[10px] text-zinc-400">
              {r.platform}
            </span>
          )}

          {r.snippetType && (
            <span className="rounded-md border border-white/6 bg-white/4 px-2 py-1 text-[10px] text-zinc-400">
              {r.snippetType}
            </span>
          )}
        </div>

        {/* Tags */}
        {r.tags && r.tags.length > 0 && (
          <div className="mt-3 flex min-w-0 gap-1.5 overflow-hidden">
            {r.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[10px] text-zinc-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 flex min-w-0 items-center gap-3 border-t border-white/6 pt-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1 text-zinc-300">
            <Star
              size={13}
              fill="currentColor"
            />
            {Number(r.rating ?? 0).toFixed(1)}
          </span>

          <span className="flex items-center gap-1">
            <Download size={13} />
            {formatNumber(r.downloads)}
          </span>

          {typeof r.views === 'number' && (
            <span className="flex items-center gap-1">
              <Eye size={13} />
              {formatNumber(r.views)}
            </span>
          )}
        </div>

        {r.kind === 'Script' && (r.mediafireUrl || r.githubUrl) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {r.mediafireUrl && (
              <a href={r.mediafireUrl} target="_blank" rel="noopener noreferrer nofollow" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200">
                <Download size={13} /> MediaFire
              </a>
            )}
            {r.githubUrl && (
              <a href={r.githubUrl} target="_blank" rel="noopener noreferrer nofollow" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/10">
                <ArrowUpRight size={13} /> GitHub
              </a>
            )}
          </div>
        )}

        {/* Author / uploader */}
        <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/6 text-zinc-500">
              <UserRound size={14} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-[11px] text-zinc-500">
                Author
              </p>

              <p className="truncate text-xs text-zinc-300">
                {r.author || 'Unknown'}
              </p>
            </div>
          </div>

          {r.uploaderName && (
            <div className="min-w-0 text-right">
              <p className="text-[10px] text-zinc-600">
                Uploaded by
              </p>

              <p className="max-w-28 truncate text-[11px] text-zinc-400">
                {r.uploaderName}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}