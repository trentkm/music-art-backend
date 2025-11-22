import * as fs from 'fs';
import { File } from 'node:buffer';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

// Polyfill File on Node 18 runtimes for OpenAI uploads
if (typeof (globalThis as any).File === 'undefined') {
  (globalThis as any).File = File as unknown as typeof File;
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

  const imageFile = await toFile(fs.createReadStream(collagePath), 'collage.png', {
    contentType: 'image/png'
  });

  const response = await openaiClient.images.edits({
    model: 'gpt-image-1',
    image: imageFile,
    prompt: prompt || 'Blend these album covers into a single cohesive, modern album artwork.',
    size: '1024x1024'
  });

  const base64 = response.data[0]?.b64_json;
  if (!base64) {
    throw new Error('OpenAI did not return image data');
  }

  console.log('blendImage: received edited image bytes');
  return Buffer.from(base64, 'base64');
};
