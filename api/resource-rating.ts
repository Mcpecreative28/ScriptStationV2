
import {
  requireUser,
  requireApprovedResource,
  sendError,
  FieldValue
} from "./resource-tracking";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method tidak diizinkan." });
  }

  try {
    const user = await requireUser(req);
    const resourceId = req.body?.resourceId;
    const rating = req.body?.rating;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating harus berupa angka bulat 1–5." });
    }

    const { db, ref } = await requireApprovedResource(resourceId);
    const ratingRef = ref.collection("ratings").doc(user.uid);

    const result = await db.runTransaction(async (tx) => {
      const resourceSnap = await tx.get(ref);
      const previousSnap = await tx.get(ratingRef);

      if (!resourceSnap.exists || resourceSnap.data()?.status !== "approved") {
        const error: any = new Error("Resource tidak tersedia.");
        error.status = 404;
        throw error;
      }

      const resource = resourceSnap.data()!;
      const previousRating = previousSnap.exists
        ? Number(previousSnap.data()?.rating || 0)
        : 0;

      const count = Math.max(0, Number(resource.ratingCount) || 0);
      const sum = Number.isFinite(Number(resource.ratingSum))
        ? Number(resource.ratingSum)
        : Number(resource.averageRating ?? resource.rating ?? 0) * count;

      const nextCount = count + (previousSnap.exists ? 0 : 1);
      const nextSum = sum - previousRating + rating;
      const average = nextCount > 0 ? nextSum / nextCount : 0;

      tx.set(ratingRef, {
        uid: user.uid,
        rating,
        updatedAt: FieldValue.serverTimestamp()
      });

      tx.update(ref, {
        ratingSum: nextSum,
        ratingCount: nextCount,
        averageRating: average,
        rating: average,
        updatedAt: FieldValue.serverTimestamp()
      });

      return { averageRating: average, ratingCount: nextCount };
    });

    return res.status(200).json({
      success: true,
      ...result,
      yourRating: rating
    });
  } catch (error) {
    return sendError(res, error);
  }
}