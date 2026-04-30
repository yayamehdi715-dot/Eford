const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const r2Client = require('../config/r2');
const { v4: uuidv4 } = require('uuid');

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;

// Génère une presigned URL pour upload direct client → R2 (évite le transit par Render)
const getUploadPresignedUrl = async (fileName, contentType, folder = 'assignments') => {
  const ext = fileName.split('.').pop();
  const key = `${folder}/${uuidv4()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  // URL valide 15 minutes pour l'upload
  const url = await getSignedUrl(r2Client, command, { expiresIn: 900 });
  return { url, key };
};

// Génère une presigned URL pour téléchargement sécurisé (1 heure)
const getDownloadPresignedUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn: 3600 });
};

// Supprime un fichier de R2 quand un devoir est supprimé
const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  return r2Client.send(command);
};

module.exports = { getUploadPresignedUrl, getDownloadPresignedUrl, deleteFile };
