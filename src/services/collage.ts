import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const downloadImage = async (url: string, targetPath: string) => {
  const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  await fs.promises.writeFile(targetPath, Buffer.from(response.data));
};

export const buildCollage = async (urls: string[]): Promise<string> => {
  if (!urls.length) {
    throw new Error('No image URLs provided');
  }

  const downloadDir = '/tmp';
  const collagePath = path.join(downloadDir, `collage-${randomUUID()}.png`);

  const images = await Promise.all(
    urls.map(async (url) => {
      const filePath = path.join(downloadDir, `${randomUUID()}.png`);
      await downloadImage(url, filePath);
      return filePath;
    })
  );

  const cols = Math.ceil(Math.sqrt(images.length));
  const rows = Math.ceil(images.length / cols);
  const cellSize = 320;
  const width = cols * cellSize;
  const height = rows * cellSize;

  const composites = await Promise.all(
    images.map(async (file, index) => {
      const buffer = await sharp(file).resize(cellSize, cellSize, { fit: 'cover' }).toBuffer();
      return {
        input: buffer,
        left: (index % cols) * cellSize,
        top: Math.floor(index / cols) * cellSize
      };
    })
  );

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#0f0f0f'
    }
  })
    .composite(composites)
    .png()
    .toFile(collagePath);

  return collagePath;
};
