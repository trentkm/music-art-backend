import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const s3 = new S3Client({});

export const uploadImage = async (buffer: Buffer): Promise<string> => {
  const bucket = process.env.BUCKET_NAME;
  if (!bucket) {
    throw new Error('BUCKET_NAME is not configured');
  }

  const key = `images/${randomUUID()}.png`;

  console.log('uploadImage: uploading to S3', { bucket, key, bytes: buffer.length });
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
      ACL: 'public-read'
    })
  );

  const url = `https://${bucket}.s3.amazonaws.com/${key}`;
  console.log('uploadImage: upload complete', { url });
  return url;
};
