
import { getAdminServices, sendError } from "./resource-tracking";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method tidak diizinkan." });
  }

  try {
    const { db } = getAdminServices();

    const [usersSnap, resourcesSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("scripts").where("status", "==", "approved").get()
    ]);

    let views = 0;
    let downloads = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    for (const doc of resourcesSnap.docs) {
      const data = doc.data();

      views += Math.max(0, Number(data.views) || 0);
      downloads += Math.max(0, Number(data.downloads) || 0);

      const count = Math.max(0, Number(data.ratingCount) || 0);
      const sum = Number.isFinite(Number(data.ratingSum))
        ? Number(data.ratingSum)
        : Number(data.averageRating ?? data.rating ?? 0) * count;

      ratingSum += sum;
      ratingCount += count;
    }

    return res.status(200).json({
      success: true,
      totalUsers: usersSnap.size,
      totalResources: resourcesSnap.size,
      totalViews: views,
      totalDownloads: downloads,
      averageRating: ratingCount ? ratingSum / ratingCount : 0,
      totalRatings: ratingCount
    });
  } catch (error) {
    return sendError(res, error);
  }
}