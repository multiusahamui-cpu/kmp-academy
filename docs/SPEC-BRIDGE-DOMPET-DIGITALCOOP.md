# Spesifikasi endpoint jembatan: dompet simpanan sukarela digitalcoop.id

Untuk ditambahkan di repo garuda-superapp (`server/routes/academy-bridge.ts`). Academy hanya memanggil, tidak pernah menyentuh database digitalcoop.id.

Semua endpoint memakai guard yang sama dengan endpoint jembatan yang ada (`requireBridgeKey`, header `X-Academy-Bridge-Key`, hanya dari server yang sama). Jumlah selalu bilangan bulat rupiah.

## 1. Cek saldo

`GET /api/bridge/academy/saldo/:digitalcoopUserId`

Respons 200: `{ "saldo": 150000, "pinSet": true }`

- Saldo = saldo Dompet Simpanan Sukarela milik anggota itu.
- `pinSet=false` berarti PIN Transaksi belum dibuat; Academy menampilkan arahan membuat PIN di digitalcoop.id.
- 404 bila akun tidak ada; 403 bila akun tidak aktif.

## 2. Debit pembayaran kursus

`POST /api/bridge/academy/debit`

Body:

```json
{ "digitalcoopUserId": "...", "amount": 75000, "pin": "123456",
  "idempotencyKey": "<id order Academy, uuid>", "description": "Pembelian kursus: <judul>" }
```

Urutan wajib di sisi digitalcoop.id:

1. Bila `idempotencyKey` sudah pernah berhasil, kembalikan hasil yang tersimpan (200) tanpa memeriksa PIN dan tanpa debit lagi.
2. `verifyTransactionPin(userId, pin)` (modul bersama yang sudah ada, termasuk lockout 5 kali). Galat PIN diteruskan apa adanya: 400 `PIN_REQUIRED` + `attemptsLeft`, 423 terkunci.
3. Pastikan akun aktif (bukan DIBLOKIR/DITUTUP/KELUAR).
4. Dalam satu transaksi database: kunci baris saldo, tolak bila saldo < amount (409 `SALDO_TIDAK_CUKUP`), kurangi saldo, catat mutasi simpanan sukarela (keterangan memuat `description` dan `idempotencyKey`), buat jurnal GL otomatis sesuai pola jurnal yang sudah dipakai, simpan catatan idempotensi.
5. Respons 200: `{ "status": "SUCCESS", "txId": "...", "saldoBaru": 75000 }`.

Aturan: `amount` harus bilangan bulat > 0; PIN tidak boleh masuk log; satu kunci tidak boleh dipakai dengan jumlah atau akun berbeda (409 `KUNCI_BENTROK`).

Akun jurnal GL (lawan dari Simpanan Sukarela, mis. utang/pendapatan Academy) ditetapkan oleh pemilik digitalcoop.id.

## 3. Status debit (rekonsiliasi)

`GET /api/bridge/academy/debit/:idempotencyKey`

Respons 200: `{ "status": "SUCCESS", "txId": "...", "amount": 75000, "at": "2026-11-19T02:00:00Z" }` atau `{ "status": "NOT_FOUND" }`.

Dipakai Academy bila debit timeout atau jawabannya tidak pasti. Academy tidak membuat enrollment sebelum status SUCCESS dipastikan.

## 4. Pembalikan debit (opsional, untuk pembatalan manual oleh Admin)

`POST /api/bridge/academy/debit/:idempotencyKey/balik` body `{ "alasan": "..." }`

Mengembalikan saldo dan membuat jurnal pembalik. Idempoten. Hanya dipanggil dari tindakan Admin Academy yang tercatat.
