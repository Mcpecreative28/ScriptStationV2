import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices, requireUser, sendError } from './resource-tracking.js';

const blockedWords = ['kata-kasar-contoh-1', 'kata-kasar-contoh-2'];

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
