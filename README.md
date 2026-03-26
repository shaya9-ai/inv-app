Offline desktop inventory/invoicing app built with Next.js 16 + Electron + SQLite (Prisma).

## Quickstart

```bash
npm install
npx prisma migrate dev --name init
npm run dev            # Next dev server
npm run build          # Next production build
npm run dist           # builds Electron .exe (packs Next + Prisma)
```

### Features
- Inventory grid with hover-to-add floating cart, cart persists locally.
- Check-in flow with auto-generated printable GRN receipt.
- Invoice list + edit modal + print-ready layout.
- Standalone new invoice screen, settings saved to `settings.json`.
- API routes under `pages/api` for products, stock, invoices, and settings.
