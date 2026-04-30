const router = require('express').Router();
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');
const { getUploadPresignedUrl } = require('../services/r2Service');

router.use(authenticate, authorize('teacher', 'admin'));

// POST /api/files/upload-url — génère une presigned URL pour upload direct vers R2
// Le fichier transite directement du client vers R2 sans passer par Render (économie de bande passante)
router.post('/upload-url', [
  body('fileName').trim().notEmpty().isLength({ max: 255 }),
  body('contentType').trim().notEmpty(),
  body('fileSize').isInt({ min: 1, max: 50 * 1024 * 1024 }), // max 50 Mo
], validate, async (req, res) => {
  try {
    const { fileName, contentType, fileSize } = req.body;

    // Whitelist des types MIME autorisés
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'text/plain',
    ];
    if (!allowedTypes.includes(contentType)) {
      return res.status(422).json({ message: 'Type de fichier non autorisé' });
    }

    const { url, key } = await getUploadPresignedUrl(fileName, contentType);
    res.json({ uploadUrl: url, key, fileName });
  } catch {
    res.status(500).json({ message: 'Erreur génération URL upload' });
  }
});

module.exports = router;
