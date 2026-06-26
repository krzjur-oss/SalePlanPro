import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'public', 'favicon.svg');
const out192 = path.join(__dirname, 'public', 'icon-192.png');
const out512 = path.join(__dirname, 'public', 'icon-512.png');

async function convert() {
  try {
    console.log('Generating 192x192 PNG icon...');
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(out192);

    console.log('Generating 512x512 PNG icon...');
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(out512);

    console.log('Icons generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

convert();
