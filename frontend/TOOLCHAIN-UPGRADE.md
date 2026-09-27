# Frontend Toolchain Upgrade

This file intentionally documents the controlled upgrade instead of applying a breaking change to the Phase 20 verified baseline.

Target versions:

- Vite 8.2.3
- @vitejs/plugin-react 6.1.1
- Vitest 5.0.2
- @vitest/coverage-v8 5.0.2
- Node.js >= 22.12

Run the upgrade on a Git branch, then regenerate `package-lock.json` with `npm install` and run:

```powershell
npm run typecheck
npm run build
npm test
npm audit
```
