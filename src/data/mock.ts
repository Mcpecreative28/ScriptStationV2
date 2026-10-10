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

  // Compatibility dengan UI lama
  desc: string;
  category: string;
  tags: string[];

  thumbnailUrl?: string | null;

  author?: string;

  uploaderName?: string;

  uploaderEmail?: string;

  ownerId?: string;

  language?: string;

  sourceCode?: string;

  scriptType?: ScriptType;

  platform?: ScriptPlatform;

  snippetType?: SnippetType;

  mediafireUrl?: string | null;

  githubUrl?: string | null;

  previewImageUrls?: string[];

  rating: number;

  downloads: number | string;

  views?: number;

  status?: 'pending' | 'approved' | 'rejected';

  createdAt?: unknown;

  updatedAt?: unknown;
};


// Data demo untuk Home.
// Data asli dari Firestore tetap dipakai di Listing.
export const resources: Resource[] = [
  {
    id: '1',
    title: 'WhatsApp Auto Responder',

    description:
      'Modular Baileys responder dengan command handler yang mudah dikembangkan.',

    desc:
      'Modular Baileys responder dengan command handler yang mudah dikembangkan.',

    category: 'WhatsApp',

    language: 'TypeScript',

    author: 'RyogaDev',

    rating: 4.9,

    downloads: '12.8K',

    tags: [
      'baileys',
      'bot',
      'automation',
    ],

    kind: 'Baileys',

    sourceCode:
      "import makeWASocket from '@whiskeysockets/baileys'\n\nconst sock = makeWASocket({ auth })",
  },

  {
    id: '2',
    title: 'Modern Express API Starter',

    description:
      'Starter API Node.js dengan validation, auth middleware dan struktur production-ready.',

    desc:
      'Starter API Node.js dengan validation, auth middleware dan struktur production-ready.',

    category: 'API',

    language: 'TypeScript',

    author: 'ArkaLabs',

    rating: 4.8,

    downloads: '8.4K',

    tags: [
      'node',
      'api',
      'backend',
    ],

    kind: 'Script',

    sourceCode:
      "import express from 'express'\n\nconst app = express()\napp.listen(3000)",
  },

  {
    id: '3',
    title: 'Firebase Rate Limiter',

    description:
      'Snippet sederhana untuk membatasi aksi user dan mengurangi abuse.',

    desc:
      'Snippet sederhana untuk membatasi aksi user dan mengurangi abuse.',

    category: 'Backend',

    language: 'TypeScript',

    author: 'Nexa',

    rating: 4.7,

    downloads: '6.2K',

    tags: [
      'firebase',
      'security',
      'rate-limit',
    ],

    kind: 'Snippet',

    sourceCode:
      "export function rateLimit(key: string) {\n  return key\n}",
  },

  {
    id: '4',
    title: 'Telegram Broadcast Tool',

    description:
      'Utility untuk mengelola broadcast dan template pesan Telegram.',

    desc:
      'Utility untuk mengelola broadcast dan template pesan Telegram.',

    category: 'Telegram',

    language: 'Python',

    author: 'CodeForge',

    rating: 4.6,

    downloads: '5.9K',

    tags: [
      'telegram',
      'python',
      'utility',
    ],

    kind: 'Script',

    sourceCode:
      "def broadcast(message):\n    print(message)",
  },

  {
    id: '5',
    title: 'Glass Dashboard UI',

    description:
      'Komponen dashboard glassmorphism yang responsif dan ringan.',

    desc:
      'Komponen dashboard glassmorphism yang responsif dan ringan.',

    category: 'Frontend',

    language: 'React',

    author: 'PixelStack',

    rating: 5,

    downloads: '4.1K',

    tags: [
      'react',
      'ui',
      'tailwind',
    ],

    kind: 'Snippet',

    sourceCode:
      "export default function Dashboard() {\n  return <div>Dashboard</div>\n}",
  },

  {
    id: '6',
    title: 'Baileys Session Manager',

    description:
      'Contoh pengelolaan session Baileys tanpa menaruh credential di client.',

    desc:
      'Contoh pengelolaan session Baileys tanpa menaruh credential di client.',

    category: 'Baileys',

    language: 'JavaScript',

    author: 'DevRoom',

    rating: 4.9,

    downloads: '3.8K',

    tags: [
      'baileys',
      'whatsapp',
      'auth',
    ],

    kind: 'Baileys',

    sourceCode:
      "const session = await loadSession()\nconsole.log(session)",
  },
];