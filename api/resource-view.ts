
import {
  requireUser,
  requireApprovedResource,
  sendError,
  FieldValue
} from "./resource-tracking.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method tidak diizinkan." });
  }

  try {
    const user = await requireUser(req);
    const { db, ref } = await requireApprovedResource(req.body?.resourceId);
    const viewerRef = ref.collection("viewers").doc(user.uid);

    const counted = await db.runTransaction(async (tx) => {
      const viewer = await tx.get(viewerRef);
      const lastViewedAt = viewer.data()?.lastViewedAt?.toMillis?.() ?? 0;
      const now = Date.now();

      if (now - lastViewedAt < 30 * 60 * 1000) {
        return false;
      }

      tx.set(viewerRef, { lastViewedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.update(ref, { views: FieldValue.increment(1) });
      return true;
    });

    return res.status(200).json({ success: true, counted });
  } catch (error) {
    return sendError(res, error);
  }
}