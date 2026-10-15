import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices, requireUser, sendError } from './resource-tracking.js';

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validUrl(value: string, optional = false) {
  if (!value && optional) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

async function requireAdmin(req: any) {
  const user = await requireUser(req);
  if (user.admin !== true) {
    const error: any = new Error('Hanya admin yang dapat mengelola marketplace.');
    error.status = 403;
    throw error;
  }
  return user;
}

export default async function handler(req: any, res: any) {
  try {
    const { db } = getAdminServices();
    const collection = db.collection('marketplaceProducts');

    if (req.method === 'GET') {
      const snapshot = await collection.orderBy('createdAt', 'desc').limit(200).get();
      const products = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          name: data.name || '',
          description: data.description || '',
          category: data.category || 'Other',
          priceLabel: data.priceLabel || 'Free',
          imageUrl: data.imageUrl || '',
          url: data.url || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null
        };
      });
      return res.status(200).json({ products });
    }

    if (req.method === 'POST') {
      await requireAdmin(req);
      const name = text(req.body?.name, 100);
      const description = text(req.body?.description, 2000);
      const category = text(req.body?.category, 60) || 'Other';
      const priceLabel = text(req.body?.priceLabel, 60) || 'Free';
      const imageUrl = text(req.body?.imageUrl, 1000);
      const url = text(req.body?.url, 1000);

      if (!name || !description || !url || !validUrl(url) || !validUrl(imageUrl, true)) {
        return res.status(400).json({ error: 'Periksa nama, deskripsi, dan URL produk.' });
      }

      const ref = await collection.add({
        name,
        description,
        category,
        priceLabel,
        imageUrl,
        url,
        createdAt: FieldValue.serverTimestamp()
      });

      return res.status(201).json({ success: true, id: ref.id });
    }

    if (req.method === 'DELETE') {
      await requireAdmin(req);
      const id = typeof req.query?.id === 'string' ? req.query.id : '';
      if (!/^[A-Za-z0-9_-]{1,150}$/.test(id)) return res.status(400).json({ error: 'ID produk tidak valid.' });
      await collection.doc(id).delete();
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  } catch (error) {
    return sendError(res, error);
  }
}
