import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const ADMIN_EMAIL = 'ryoga9753@gmail.com';

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is missing.');
  }

  if (!clientEmail) {
    throw new Error('FIREBASE_CLIENT_EMAIL is missing.');
  }

  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY is missing.');
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(
  req: {
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => {
      json: (data: unknown) => void;
    };
  }
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed.',
      });
    }

    const bootstrapSecret =
      process.env.ADMIN_BOOTSTRAP_SECRET;

    const headerValue =
      req.headers?.['x-bootstrap-secret'];

    const providedSecret =
      Array.isArray(headerValue)
        ? headerValue[0]
        : headerValue;

    if (!bootstrapSecret) {
      return res.status(500).json({
        success: false,
        error: 'ADMIN_BOOTSTRAP_SECRET is missing on Vercel.',
      });
    }

    if (!providedSecret) {
      return res.status(401).json({
        success: false,
        error: 'Bootstrap secret was not provided.',
      });
    }

    if (providedSecret !== bootstrapSecret) {
      return res.status(403).json({
        success: false,
        error: 'Invalid bootstrap secret.',
      });
    }

    const app = getAdminApp();
    const adminAuth = getAuth(app);

    const user =
      await adminAuth.getUserByEmail(ADMIN_EMAIL);

    const currentClaims =
      user.customClaims || {};

    await adminAuth.setCustomUserClaims(
      user.uid,
      {
        ...currentClaims,
        admin: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Admin claim successfully assigned.',
      uid: user.uid,
      email: user.email,
    });
  } catch (error) {
    console.error('MAKE_ADMIN_ERROR:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Unknown server error.';

    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}