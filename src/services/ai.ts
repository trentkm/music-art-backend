import * as fs from 'fs';
import OpenAI from 'openai';

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const blendImage = async (collagePath: string, prompt?: string): Promise<Buffer> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await openaiClient.images.edit({
    model: 'gpt-image-1',
    image: fs.createReadStream(collagePath),
    prompt: prompt || 'Blend these album covers into a single cohesive, modern album artwork.',
    size: '1024x1024',
    response_format: 'b64_json'
  });

  const base64 = response.data[0].b64_json;
  if (!base64) {
    throw new Error('OpenAI did not return image data');
  }

  return Buffer.from(base64, 'base64');
};
