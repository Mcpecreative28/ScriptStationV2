
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Konfigurasi Firebase Admin belum lengkap.");
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey })
  });
}

export function getAdminServices() {
  const app = getAdminApp();

  return {
    auth: getAuth(app),
    db: getFirestore(app)
  };
}

export async function requireUser(req: any) {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);

  if (!match) {
    const error: any = new Error("Silakan login terlebih dahulu.");
    error.status = 401;
    throw error;
  }

  const { auth } = getAdminServices();
  const decoded = await auth.verifyIdToken(match[1]);

  return decoded;
}

export async function requireApprovedResource(resourceId: unknown) {
  if (
    typeof resourceId !== "string" ||
    !/^[A-Za-z0-9_-]{1,150}$/.test(resourceId)
  ) {
    const error: any = new Error("ID resource tidak valid.");
    error.status = 400;
    throw error;
  }

  const { db } = getAdminServices();
  const ref = db.collection("scripts").doc(resourceId);
  const snapshot = await ref.get();

  if (!snapshot.exists || snapshot.data()?.status !== "approved") {
    const error: any = new Error("Resource tidak ditemukan atau belum disetujui.");
    error.status = 404;
    throw error;
  }

  return { db, ref, data: snapshot.data()! };
}

export function sendError(res: any, error: any) {
  const status = Number(error?.status) || 500;

  if (status === 500) {
    console.error("Resource tracking error:", error);
  }

  return res.status(status).json({
    error: status === 500
      ? "Terjadi kesalahan server."
      : error.message
  });
}

export { FieldValue };