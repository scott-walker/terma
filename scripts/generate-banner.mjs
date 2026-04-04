import sharp from 'sharp'

// Presentation banner: branded background + logo + "TERMA" text
// 1280x720 — standard AppStream screenshot size

const WIDTH = 1280
const HEIGHT = 720

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#1e1348" />
      <stop offset="50%" stop-color="#131a2e" />
      <stop offset="100%" stop-color="#0b0f1a" />
    </radialGradient>
    <radialGradient id="accent" cx="50%" cy="40%" r="35%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#accent)" />

  <!-- Subtle grid pattern -->
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-opacity="0.02" stroke-width="0.5"/>
  </pattern>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)" />

  <!-- "//" logo mark — centered, scaled from icon.svg -->
  <!-- Original slash center: (512, 511.5). Transform: translate then scale -->
  <!-- Target center: (640, 265) at scale 0.25 -->
  <g transform="translate(512, 137) scale(0.25)">
    <polygon points="440,204 563,204 378,819 256,819" fill="#e6eaf0"/>
    <polygon points="645,204 768,204 583,819 460,819" fill="#e6eaf0"/>
  </g>

  <!-- "TERMA" text -->
  <text
    x="${WIDTH / 2}"
    y="430"
    text-anchor="middle"
    font-family="'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
    font-size="56"
    font-weight="700"
    letter-spacing="18"
    fill="#e6eaf0"
  >TERMA</text>

  <!-- Tagline -->
  <text
    x="${WIDTH / 2}"
    y="468"
    text-anchor="middle"
    font-family="'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
    font-size="16"
    font-weight="400"
    letter-spacing="5"
    fill="#8b92a8"
  >MODERN TERMINAL EMULATOR</text>
</svg>`

await sharp(Buffer.from(svg))
  .png()
  .toFile('build/screenshots/banner.png')

console.log('Banner generated: build/screenshots/banner.png')
