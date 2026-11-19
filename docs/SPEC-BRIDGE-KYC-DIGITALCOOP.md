# Spesifikasi Jembatan KYC (digitalcoop.id → Academy)

Dipakai tombol "Ambil data KYC dari digitalcoop.id" di Profil > KYC Academy. Endpoint ini BELUM ada di repo garuda-superapp
(`server/routes/academy-bridge.ts`); sampai dibuat, tombol mengembalikan 404/502 dan unggah manual tetap berfungsi.

## Endpoint (server-ke-server saja)
`GET /api/bridge/academy/kyc/:digitalcoopUserId`, header `X-Academy-Bridge-Key` (pola `requireBridgeKey` yang sama).

Respons 200:
```json
{ "kyc": { "kycStatus": "completed", "nama": "...", "nik": "16 digit",
           "ktp":    { "mime": "image/jpeg", "base64": "..." },
           "selfie": { "mime": "image/jpeg", "base64": "..." } } }
```
- `kycStatus` = `users.kycStatus` apa adanya. Academy hanya menerima `completed`.
- Foto diambil server digitalcoop.id dari `ktpPhotoUrl` / `selfiePhotoUrl` lalu dikirim sebagai base64 (jangan mengirim URL).
- 404 bila anggota tidak ada atau foto/NIK kosong; 401 bila kunci salah.
- Setiap pemanggilan wajib dicatat di audit digitalcoop.id (siapa: Academy, anggota mana, kapan).
- Batasi laju (mis. 5/menit per anggota). Hanya anggota yang meminta lewat Academy (sesi Academy terautentikasi) yang memicu panggilan ini.

## Sisi Academy
Menyimpan NIK terenkripsi AES-256-GCM (`KYC_ENCRYPTION_KEY`) dan foto di R2 privat `kyc/<userId>/...`; status langsung VERIFIED, sumber DIGITALCOOP.
Satu NIK hanya boleh aktif di satu akun Academy.
