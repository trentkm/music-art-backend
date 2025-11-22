import * as fs from 'fs';
import { File, Blob } from 'node:buffer';
import OpenAI from 'openai';

// Polyfill File on Node 18 runtimes for OpenAI uploads
if (typeof (globalThis as any).File === 'undefined') {
  (globalThis as any).File = File as unknown as typeof File;
}
if (typeof (globalThis as any).Blob === 'undefined') {
  (globalThis as any).Blob = Blob as unknown as typeof Blob;
}

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const blendImage = async (collagePath: string, prompt?: string): Promise<Buffer> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  console.log('blendImage: calling OpenAI edit', {
    promptLength: prompt?.length || 0,
    file: collagePath
  });

  const buffer = await fs.promises.readFile(collagePath);
  const blob = new Blob([buffer], { type: 'image/png' });
  const imageFile = new File([blob], 'collage.png', { type: 'image/png' });

  const response = await openaiClient.images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt: prompt || 'Blend these album covers into a single cohesive, modern album artwork.',
    size: '1024x1024'
  });

  const base64 = response.data[0]?.b64_json;
  if (base64) {
    console.log('blendImage: received edited image bytes (b64)');
    return Buffer.from(base64, 'base64');
  }

  const url = response.data[0]?.url;
  if (url) {
    console.log('blendImage: received image URL, downloading');
    const res = await fetch(url);
    const arrayBuf = await res.arrayBuffer();
    console.log('blendImage: downloaded image bytes', { bytes: arrayBuf.byteLength });
    return Buffer.from(arrayBuf);
  }

  throw new Error('OpenAI did not return image data');
};
