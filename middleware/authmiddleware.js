// middleware/authMiddleware.js
const admin = require('firebase-admin');
require('dotenv').config();
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccount)),
});

// Middleware to verify Firebase ID token
const verifyFirebaseToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'No valid authorization header found' 
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    if(!decodedToken) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid token' 
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };

    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid or expired token' 
    });
  }
};

module.exports= verifyFirebaseToken;