// Generate PNG icons from SVG using built-in Node.js
// Run: node scripts/generate-icons.js
// This creates simple colored square icons with "KC" text

const fs = require('fs')
const path = require('path')

function createSVG(size) {
  const fontSize = Math.round(size * 0.35)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a855f7"/>
      <stop offset="100%" style="stop-color:#4f46e5"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#bg)"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="${fontSize}" fill="white" letter-spacing="${Math.round(fontSize * 0.05)}">KC</text>
</svg>`
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })

// Create SVG versions (these work as fallbacks)
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), createSVG(192))
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), createSVG(512))

console.log('SVG icons generated in public/icons/')
console.log('Note: For production PNG icons, convert these SVGs to PNG using any online tool.')
