import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Konfigurasi Firebase Admin belum lengkap.");
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type Response = {
  setHeader(name: string, value: string): void;
  status(code: number): Response;
  json(body: unknown): unknown;
};

export default async function handler(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Gunakan POST." });
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      message: "IMGBB_API_KEY belum diatur di Vercel.",
    });
  }

  try {
    const authHeader = req.headers.authorization;
    const authorization = Array.isArray(authHeader)
      ? authHeader[0]
      : authHeader || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Silakan login kembali." });
    }

    getAdminApp();
    await getAuth().verifyIdToken(authorization.slice(7));

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const image =
      body && typeof body === "object" && "image" in body &&
      typeof body.image === "string"
        ? body.image
        : "";

    const name =
      body && typeof body === "object" && "name" in body &&
      typeof body.name === "string"
        ? body.name.slice(0, 100)
        : "scriptstation-image";

    const contentType =
      body && typeof body === "object" && "contentType" in body &&
      typeof body.contentType === "string"
        ? body.contentType
        : "";

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(contentType) || !image) {
      return res.status(400).json({
        message: "Pilih gambar JPG, PNG, WEBP, atau GIF.",
      });
    }

    // Batasi file asli sekitar 1 MB agar payload tidak terlalu besar.
    if (image.length > 1.5 * 1024 * 1024) {
      return res.status(413).json({
        message: "Gambar terlalu besar. Maksimal sekitar 1 MB per gambar.",
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let response: globalThis.Response;

    try {
      const form = new URLSearchParams();
      form.set("key", apiKey);
      form.set("image", image);
      form.set("name", name);

      response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success || !result?.data?.url) {
      console.error("ImgBB upload failed:", response.status, result?.error);

      return res.status(502).json({
        message:
          result?.error?.message ||
          "ImgBB menolak gambar. Periksa API key atau coba gambar lain.",
      });
    }

    return res.status(200).json({
      url: result.data.display_url || result.data.url,
    });
  } catch (error) {
    console.error("Upload image error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return res.status(504).json({
        message: "ImgBB timeout. Coba lagi dengan gambar lebih kecil.",
      });
    }

    if (
      error instanceof Error &&
      error.message.includes("Konfigurasi Firebase Admin")
    ) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Upload gagal. Periksa konfigurasi server dan log Vercel.",
    });
  }
}
