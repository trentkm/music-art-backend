import * as fs from 'fs';
import axios from 'axios';
import OpenAI from 'openai';

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const blendImage = async (collagePath: string, prompt?: string): Promise<Buffer> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  console.log('blendImage: calling OpenAI edit', {
    promptLength: prompt?.length || 0,
    file: collagePath
  });

  const response = await openaiClient.images.edit({
    model: 'gpt-image-1',
    image: fs.createReadStream(collagePath) as unknown as File,
    prompt: prompt || 'Blend these album covers into a single cohesive, modern album artwork.',
    size: '1024x1024'
  });

  const url = response.data[0]?.url;
  if (!url) {
    throw new Error('OpenAI did not return an image URL');
  }

  console.log('blendImage: received image URL, downloading');
  const img = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  console.log('blendImage: downloaded image bytes', { bytes: img.data.byteLength });
  return Buffer.from(img.data);
};
