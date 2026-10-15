import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices, requireUser, sendError } from './resource-tracking.js';

const blockedWords = [
  'anjing',
  'anj1ng',
  'anjink',
  'yatim',
  'anjrit',
  'anj',
  'anjeng',
  'anjg',
  'anjng',
  'anjinggg',
  'anjingggg',
  'jawa',
  'hitam',
  'ireng',
  'negro',
  'jawir',

  'bangsat',
  'bangsad',
  'bang6at',
  'bangke',
  'bangkai',
  'bangsattt',
  'bangsadtt',

  'bajingan',
  'baj1ngan',
  'bajinganmu',
  'bajinganlu',
  'bajingan lo',

  'brengsek',
  'brengsekk',
  'brengsekkkk',

  'kontol',
  'kont0l',
  'k0ntol',
  'k0nt0l',
  'kntl',
  'kontoll',
  'kontolmu',
  'kontol lu',
  'kontol lo',

  'memek',
  'mem3k',
  'm3mek',
  'mmk',
  'memekk',
  'memekmu',
  'memek lu',
  'memek lo',

  'ngentot',
  'ngent0t',
  'ngentott',
  'ngentod',
  'ngntot',
  'entot',
  'ent0t',

  'jancok',
  'janc0k',
  'jancuk',
  'jancuq',
  'jancokk',
  'dancok',
  'dancuk',
  'danc0k',
  'jancokmu',

  'asu',
  'asw',
  'asuu',
  'asuuu',
  'asu tenan',

  'tolol',
  'tololl',
  'tololmu',
  'tolol lu',
  'tolol lo',

  'goblok',
  'g0blok',
  'gblk',
  'goblokk',
  'goblokmu',
  'goblok lu',
  'goblok lo',

  'bego',
  'beg0',
  'bego lu',
  'bego lo',

  'bacot',
  'bacotmu',
  'bacot lu',
  'bacot lo',
  'bacottt',

  'tai',
  'taik',
  'taikk',
  'taimu',
  'tai lu',
  'tai lo',

  'keparat',
  'keparatt',
  'kampret',
  'kamprett',
  'kampret lu',
  'bedebah',
  'laknat',
  'brengsek lu',
  'brengsek lo',

  'pukimak',
  'puki mak',
  'cibai',
  'kimak',
  'pantek',
  'lancau',
  'piatu',
  'yapit',
  'maklo',
  'bapaklo',
  'mak lo',
  'bapak lo',
  'lonte',

  'fuck',
  'f u c k',
  'f.u.c.k',
  'fck',
  'fuk',
  'fukkk',
  'fucking',
  'fuckinggg',
  'fucker',
  'fuckers',
  'fuckface',
  'fuckwit',
  'fuck off',
  'fuck you',
  'fuck u',
  'f u',
  'motherfucker',
  'motherfuckers',
  'motherfucking',

  'shit',
  'sh1t',
  'shyt',
  'shiit',
  'shitty',
  'shithead',
  'shitface',
  'bullshit',
  'dipshit',
  'dumbshit',
  'holy shit',

  'bitch',
  'b1tch',
  'biatch',
  'bitches',
  'son of a bitch',
  'stupid bitch',

  'bastard',
  'bastards',
  'asshole',
  'assholes',
  'a s s h o l e',
  'arsehole',
  'arseholes',
  'dickhead',
  'dickheads',
  'dumbass',
  'dumbasses',
  'jackass',
  'jackasses',
  'asswipe',
  'asshat',
  'dipstick',
  'douchebag',
  'scumbag',
  'shitbag',

  'cunt',
  'cunts',
  'twat',
  'prick',
  'wanker',
  'tosser',
  'bollocks',
  'piss off',
  'pissed off',
  'goddamn',
  'dammit',
  'crap',

  'fucking idiot',
  'fucking moron',
  'piece of shit',
  'piece of crap',
  'shut the fuck up',
  'go fuck yourself',
  'fuck yourself',
  'you son of a bitch',
  'you piece of shit',
];

function normalizeForModeration(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[0-9]/g, (char) => {
      const replacements: Record<string, string> = {
        '0': 'o',
        '1': 'i',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't',
      };

      return replacements[char] ?? char;
    })
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/[\s._*-]+/g, ' ')
    .trim();
}

function cleanText(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
}

export default async function handler(req: any, res: any) {
  try {
    const { db } = getAdminServices();

    if (req.method === 'GET') {
      const snapshot = await db.collection('roomMessages').orderBy('createdAt', 'desc').limit(100).get();
      const messages = snapshot.docs.reverse().map((item) => {
        const data = item.data();
        const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || null;
        return {
          id: item.id,
          uid: data.uid || '',
          displayName: data.displayName || 'Developer',
          photoURL: data.photoURL || '',
          text: data.text || '',
          createdAt
        };
      });
      return res.status(200).json({ messages });
    }

    if (req.method === 'POST') {
      const user = await requireUser(req);
      const text = cleanText(req.body?.text);

      if (!text || text.length > 500) {
        return res.status(400).json({ error: 'Pesan wajib diisi dan maksimal 500 karakter.' });
      }

      const lowered = text.toLowerCase();
      if (blockedWords.some((word) => word && lowered.includes(word))) {
        return res.status(400).json({ error: 'Pesan mengandung kata yang tidak diperbolehkan.' });
      }

      const rateRef = db.collection('roomRateLimits').doc(user.uid);
      const messageRef = db.collection('roomMessages').doc();
      await db.runTransaction(async (transaction) => {
        const rateSnap = await transaction.get(rateRef);
        const now = Date.now();
        const start = Number(rateSnap.data()?.windowStart || 0);
        const count = start > 0 && now - start < 60000 ? Number(rateSnap.data()?.count || 0) : 0;

        if (count >= 5) {
          const error: any = new Error('Batas pesan tercapai. Coba lagi setelah satu menit.');
          error.status = 429;
          throw error;
        }

        transaction.set(rateRef, {
          windowStart: count === 0 ? now : start,
          count: count + 1,
          updatedAt: FieldValue.serverTimestamp()
        });

        transaction.set(messageRef, {
          uid: user.uid,
          displayName: typeof user.name === 'string' ? user.name.slice(0, 80) : 'Developer',
          photoURL: typeof user.picture === 'string' ? user.picture : '',
          text,
          createdAt: FieldValue.serverTimestamp()
        });
      });

      return res.status(201).json({ success: true, id: messageRef.id });
    }

    if (req.method === 'DELETE') {
      const user = await requireUser(req);
      if (user.admin !== true) return res.status(403).json({ error: 'Akses admin diperlukan.' });
      const id = typeof req.query?.id === 'string' ? req.query.id : '';
      if (!/^[A-Za-z0-9_-]{1,150}$/.test(id)) return res.status(400).json({ error: 'ID pesan tidak valid.' });
      await db.collection('roomMessages').doc(id).delete();
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  } catch (error) {
    return sendError(res, error);
  }
}