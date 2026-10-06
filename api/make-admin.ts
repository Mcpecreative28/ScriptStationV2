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

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin environment variables are missing.'
    );
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
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const bootstrapSecret =
    process.env.ADMIN_BOOTSTRAP_SECRET;

  const providedSecret = req.headers?.[
    'x-bootstrap-secret'
  ];

  if (
    !bootstrapSecret ||
    providedSecret !== bootstrapSecret
  ) {
    return res.status(403).json({
      error: 'Forbidden',
    });
  }

  try {
    const app = getAdminApp();
    const adminAuth = getAuth(app);

    const user =
      await adminAuth.getUserByEmail(ADMIN_EMAIL);

    const currentClaims = user.customClaims || {};

    await adminAuth.setCustomUserClaims(user.uid, {
      ...currentClaims,
      admin: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Admin claim successfully assigned.',
      uid: user.uid,
      email: user.email,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to assign admin claim.',
    });
  }
}