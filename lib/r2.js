// lib/r2.js — Cloudflare R2 via the S3 SDK. Same pattern as ls_crm, new account/bucket.
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

let r2 = null;
function client() {
  if (!r2) {
    r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return r2;
}

export function isR2Configured() {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
}

// Uploads a Buffer, returns the public URL.
export async function uploadToR2(buffer, filename, contentType) {
  const key = `${Date.now()}-${filename.replace(/\s+/g, '_')}`;
  await client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  }));
  const domain = (process.env.R2_PUBLIC_DOMAIN_URL || '').trim().replace(/^https?:\/\//i, '');
  return `https://${domain}/${key}`;
}

export async function deleteFromR2(fileUrl) {
  const key = fileUrl.split('/').pop();
  await client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
}
