
import {
  requireUser,
  requireApprovedResource,
  sendError,
  FieldValue,
} from "./resource-tracking.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method tidak diizinkan.",
    });
  }

  try {
    const user = await requireUser(req);

    const { db, ref } = await requireApprovedResource(
      req.body?.resourceId
    );

    // Satu hitungan per pengguna per hari UTC.
    const day = new Date().toISOString().slice(0, 10);

    const downloadRef = ref
      .collection("downloaders")
      .doc(`${user.uid}_${day}`);

    const counted = await db.runTransaction(async (tx) => {
      const previous = await tx.get(downloadRef);

      if (previous.exists) {
        return false;
      }

      tx.create(downloadRef, {
        uid: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(ref, {
        downloads: FieldValue.increment(1),
      });

      return true;
    });

    return res.status(200).json({
      success: true,
      counted,
    });
  } catch (error) {
    return sendError(res, error);
  }
}