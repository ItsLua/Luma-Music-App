import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
await mkdir('public/icons', { recursive: true })
for (const size of [192, 512])
  await sharp('public/favicon.svg').resize(size, size).png().toFile(`public/icons/icon-${size}.png`)
await sharp('public/favicon.svg').resize(180, 180).png().toFile('public/apple-touch-icon.png')
const mark = await sharp('public/favicon.svg').resize(320, 320).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#ccff5f' } })
  .composite([{ input: mark }])
  .png()
  .toFile('public/icons/maskable-512.png')
