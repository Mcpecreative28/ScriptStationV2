export type ResourceKind =
  | 'Script'
  | 'Snippet'
  | 'Baileys';

export type ScriptType =
  | 'Full Case'
  | 'Full Plugins'
  | 'Plugins + Case';

export type ScriptPlatform =
  | 'WhatsApp Bot'
  | 'Telegram Bot'
  | 'Discord Bot'
  | 'Website';

export type SnippetType =
  | 'Case'
  | 'Plugin'
  | 'Function'
  | 'Utility'
  | 'Config'
  | 'Other';

export type Resource = {
  id: string;

  kind: ResourceKind;

  title: string;

  description: string;

  thumbnailUrl?: string | null;

  author?: string;

  uploaderName?: string;

  uploaderEmail?: string;

  ownerId?: string;

  language?: string;

  sourceCode: string;

  scriptType?: ScriptType;

  platform?: ScriptPlatform;

  snippetType?: SnippetType;

  mediafireUrl?: string | null;

  githubUrl?: string | null;

  rating: number;

  downloads: number;

  views?: number;

  status?: 'pending' | 'approved' | 'rejected';

  createdAt?: unknown;

  updatedAt?: unknown;
};