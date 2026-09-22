# Overtime Frontend Template

Frontend ini memakai React + Vite. Dokumentasi ini dibuat supaya setup API, auth token, dan deployment konsisten di local maupun production.

## Menjalankan Project

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
```

Preview hasil build:

```bash
npm run preview
```

## Environment Variables

Gunakan file `.env.example` sebagai contoh konfigurasi.

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_AUTH_TOKEN=
VITE_AUTH_TOKEN_STORAGE_KEY=overtime_auth_token
VITE_LOGIN_URL=https://pilargroup.id/login
```

Catatan penting:

- `.env.development` hanya dipakai saat menjalankan `npm run dev`.
- Saat deploy atau `npm run build`, value env harus di-set di environment hosting atau file env production yang dipakai saat build.
- Semua env yang ingin dibaca oleh Vite harus diawali `VITE_`.
- Jangan menyimpan secret production jangka panjang di `VITE_AUTH_TOKEN`, karena env frontend akan terlihat di browser setelah build.
- `VITE_LOGIN_URL` menentukan base URL halaman login pusat Pilargroup yang dipakai untuk redirect saat sesi tidak valid. Default-nya `https://pilargroup.id/login` kalau env ini tidak di-set.

## Redirect Otomatis ke Login Pusat

Saat aplikasi dibuka, `App.jsx` memanggil `GET /auth/me` untuk memastikan sesi masih valid. Selama proses pengecekan ini, dashboard belum dirender (menghindari flicker konten sebelum redirect).

Perilaku berdasarkan hasil `/auth/me`:

- **Berhasil (200)** → dashboard dirender seperti biasa dengan data user dari response.
- **Gagal dengan status lain (network error, 500, dll)** → dashboard tetap dirender dengan profil default (fallback), sama seperti perilaku sebelumnya.
- **Gagal dengan status 401 (Unauthorized)** → browser di-redirect ke:

  ```text
  <VITE_LOGIN_URL>?return_url=<url halaman saat ini, sudah di-encode>
  ```

  Contoh: `https://pilargroup.id/login?return_url=https%3A%2F%2Fovertime.pilargroup.id%2FRequestOvertime`

Redirect **hanya** terjadi kalau backend benar-benar mengembalikan 401, bukan hanya karena token tidak ada di `localStorage` — supaya alur dev-auth fallback (`VITE_AUTH_TOKEN`) dan mekanisme token-dari-URL di bawah ini tetap jalan seperti biasa.

Setelah user login di halaman pusat dan diarahkan kembali ke `return_url` dengan token (lihat bagian "Cara Mengirim Token Saat Deploy"), token tersebut otomatis ditangkap dari URL, disimpan ke `localStorage`, lalu dibersihkan dari address bar oleh logika yang sudah ada di `src/services/api.js`.

## Auth Token dan LocalStorage

Token auth dikelola di `src/services/api.js`.

Saat aplikasi dibuka, `api.js` akan mencari token dengan urutan berikut:

1. Token dari URL: `?token=...`, `?access_token=...`, atau `?auth_token=...`.
2. Token yang sudah ada di `localStorage`.
3. Token dari env `VITE_AUTH_TOKEN`.

Jika token ditemukan, token akan disimpan ke `localStorage` dengan key:

```text
overtime_auth_token
```

Key bisa diganti lewat:

```env
VITE_AUTH_TOKEN_STORAGE_KEY=nama_key_baru
```

Semua request API otomatis memakai header:

```http
Authorization: Bearer <token>
```

Logout akan menjalankan `api.clearToken()` sehingga token di `localStorage` ikut terhapus.

## Cara Mengirim Token Saat Deploy

Ada dua cara yang umum dipakai.

Set token saat build di hosting:

```env
VITE_AUTH_TOKEN=isi_token
```

Atau kirim token lewat URL redirect:

```text
https://domain-deploy.com/?token=isi_token
https://domain-deploy.com/?access_token=isi_token
https://domain-deploy.com/?auth_token=isi_token
```

Setelah halaman dibuka, token akan masuk ke `localStorage` dan parameter token di URL akan dibersihkan.

## Checklist Jika Token Tidak Masuk LocalStorage

- Pastikan membuka `Application > Local Storage > domain deploy`, bukan `localhost`.
- Pastikan `VITE_AUTH_TOKEN` tidak kosong saat production build.
- Pastikan env diset sebelum build, karena Vite membaca env pada waktu build.
- Pastikan nama env diawali `VITE_`.
- Pastikan URL token memakai salah satu nama param yang didukung: `token`, `access_token`, atau `auth_token`.
- Jika sudah pernah logout, token akan dihapus dari `localStorage`; buka lagi URL yang membawa token atau set ulang env.
- Cek tab `Network` dan pastikan request API punya header `Authorization: Bearer <token>`.

## File Penting

- `src/services/api.js`: konfigurasi base URL, token, localStorage, dan wrapper request API.
- `src/App.jsx`: load user dari `api.auth.me()` dan menampilkan profil user.
- `src/components/template/logoutService.js`: clear token saat logout.
- `.env.example`: contoh env yang harus disiapkan.
- `.env.development`: env local development.

## Catatan Deployment

Jika API dan frontend berada di domain yang sama, `VITE_API_BASE_URL=/api` biasanya lebih aman untuk production.

Jika API berada di domain berbeda, gunakan URL lengkap:

```env
VITE_API_BASE_URL=https://api-domain.com/api
```

Pastikan backend mengizinkan CORS dari domain frontend jika memakai domain berbeda.
