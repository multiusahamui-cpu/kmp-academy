# TODO Production Readiness

Dokumen ini berisi checklist implementasi agar KMP - ADNG Academy siap production.

## Cara Pakai

- Gunakan checklist per fase sebagai sprint backlog.
- Setiap item yang selesai ditandai dan dilampirkan bukti (PR, screenshot CI, atau dokumen).
- Review status minimal 1x per minggu.

## Fase 0 - Alignment Arsitektur (Minggu 1)

- [ ] Finalisasi keputusan tool monorepo: `pnpm workspaces` atau `npm workspaces`.
- [ ] Definisikan struktur target: `apps/web`, `apps/api`, `packages/shared-types`, `packages/shared-utils`, `packages/config-*`.
- [ ] Samakan source of truth role dan domain model lintas FE-BE.
- [ ] Putuskan standar style: ESLint + Prettier + TypeScript strictness.

Definition of done:

- [ ] Dokumen arsitektur target disetujui tim.

## Fase 1 - Monorepo Foundation (Minggu 1-2)

- [ ] Bentuk workspace root dan pindahkan package sesuai struktur target.
- [ ] Tambah script root terpusat: `dev`, `build`, `lint`, `typecheck`, `test`.
- [ ] Setup package shared untuk type/model yang dipakai FE-BE.
- [ ] Rapikan path alias dan `tsconfig` base agar konsisten.

Definition of done:

- [ ] Menjalankan satu perintah dari root untuk start web+api (parallel) berhasil.
- [ ] Web dan API build sukses dari root.

## Fase 2 - Quality Gates (Minggu 2-3)

- [ ] Tambah ESLint + Prettier di semua package.
- [ ] Aktifkan TypeScript strict mode bertahap.
- [ ] Tambah test backend (unit + integration API).
- [ ] Tambah test frontend (unit/component).
- [ ] Tambah minimal smoke e2e untuk login dan alur kursus.

Definition of done:

- [ ] Coverage baseline ditetapkan (misal 60% dulu, naik bertahap).
- [ ] PR wajib lulus lint, typecheck, test.

## Fase 3 - CI/CD (Minggu 3-4)

- [ ] Buat workflow CI untuk install, lint, typecheck, test, build.
- [ ] Tambah caching dependency untuk mempercepat pipeline.
- [ ] Definisikan release strategy (staging -> production).
- [ ] Tambah protection rule branch utama.

Definition of done:

- [ ] Setiap commit/PR tervalidasi otomatis.
- [ ] Deployment staging otomatis saat merge ke branch tertentu.

## Fase 4 - Security dan Observability (Minggu 4-5)

- [ ] Tambah rate limiter untuk endpoint sensitif.
- [ ] Kencangkan CORS allowlist per environment.
- [ ] Validasi upload file (mime/type/size/scan policy).
- [ ] Terapkan env validation schema saat startup.
- [ ] Tambah structured logging + request id.
- [ ] Integrasikan error monitoring (contoh Sentry/OpenTelemetry).

Definition of done:

- [ ] Incident dasar bisa dilacak dari request masuk sampai error point.

## Fase 5 - Data dan Runtime Reliability (Minggu 5+)

- [ ] Standarisasi migrasi/seed/reset DB untuk local/staging/production.
- [ ] Tambah backup-restore SOP database.
- [ ] Tambah healthcheck readiness/liveness yang sesuai kebutuhan deploy.
- [ ] Susun runbook operasional (rollback, restart, migration failure).

Definition of done:

- [ ] Proses pemulihan insiden terdokumentasi dan dapat dijalankan.

## Quick Wins

- [ ] Satukan enum role FE-BE agar tidak mismatch.
- [ ] Bentuk workspace monorepo + root scripts.
- [ ] Pasang lint + typecheck sebagai quality gate minimum.
- [ ] Tambahkan CI dasar untuk PR.
- [ ] Buat `.env.example` dan env validation.
