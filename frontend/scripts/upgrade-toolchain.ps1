$ErrorActionPreference = 'Stop'
Write-Host 'Upgrading the frontend Vite/Vitest toolchain...' -ForegroundColor Cyan
npm install -D vite@8.2.3 @vitejs/plugin-react@6.1.1 vitest@5.0.2 @vitest/coverage-v8@5.0.2
npm run typecheck
npm run build
npm test
npm audit
