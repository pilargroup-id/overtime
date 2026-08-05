# FE Consume Guide — User Permission & National Holiday

Dokumentasi ini menjelaskan perubahan endpoint **User Permission** dan pembatasan akses **National Holiday** untuk kebutuhan implementasi Frontend Overtime.

---

## 1. Ringkasan Perubahan

Perubahan utama pada backend:

1. `PUT /api/master/user-permissions/:id` dapat digunakan untuk mengaktifkan atau menonaktifkan permission melalui field `is_active`.
2. Ditambahkan hard delete:
   `DELETE /api/master/user-permissions/:id`.
3. Seluruh endpoint master National Holiday sekarang hanya dapat diakses oleh user yang memiliki permission aktif `REPORT_MANAGE`, termasuk endpoint `GET`.
4. Pembatasan endpoint National Holiday tidak mengganggu proses submit overtime user biasa.

---

# A. USER PERMISSION

## 2. Field Status yang Digunakan

Pada tabel `user_permissions` tidak ada kolom bernama `status`.

Field yang digunakan untuk menentukan permission aktif atau nonaktif adalah:

```text
is_active
```

Nilai yang didukung:

| Nilai | Arti |
|---:|---|
| `1` | Permission aktif |
| `0` | Permission nonaktif |

Frontend **jangan mengirim field `status`**, karena field tersebut tidak tersedia pada schema backend.

---

## 3. Update User Permission

### Endpoint

```http
PUT /api/master/user-permissions/:id
```

Endpoint ini mendukung partial update. Frontend hanya perlu mengirim field yang ingin diubah.

### Menonaktifkan permission

```json
{
  "is_active": 0
}
```

### Mengaktifkan kembali permission

```json
{
  "is_active": 1
}
```

### Contoh Axios

```js
await api.put(`/api/master/user-permissions/${permissionId}`, {
  is_active: 0,
});
```

### Contoh update tanggal berlaku

```json
{
  "valid_from": "2026-08-01",
  "valid_until": "2026-12-31"
}
```

### Field yang dapat diperbarui

```text
user_id
permission_type
scope_type
company_id
department_id
granted_by
is_active
valid_from
valid_until
```

### Catatan scope

#### `REQUEST_CREATE_ALL`

Harus menggunakan:

```json
{
  "permission_type": "REQUEST_CREATE_ALL",
  "scope_type": "GLOBAL"
}
```

#### `REPORT_MANAGE`

Harus menggunakan:

```json
{
  "permission_type": "REPORT_MANAGE",
  "scope_type": "GLOBAL"
}
```

#### `REQUEST_CREATE_SCOPED`

Harus menggunakan scope `COMPANY` atau `DEPARTMENT`.

Contoh scope company:

```json
{
  "permission_type": "REQUEST_CREATE_SCOPED",
  "scope_type": "COMPANY",
  "company_id": "comp-pnm-0001",
  "department_id": null
}
```

Contoh scope department:

```json
{
  "permission_type": "REQUEST_CREATE_SCOPED",
  "scope_type": "DEPARTMENT",
  "company_id": null,
  "department_id": 4
}
```

---

## 4. Hard Delete User Permission

### Endpoint

```http
DELETE /api/master/user-permissions/:id
```

Endpoint ini menghapus record secara permanen dari tabel `user_permissions`.

### Contoh Axios

```js
await api.delete(`/api/master/user-permissions/${permissionId}`);
```

### Kapan menggunakan DELETE

Gunakan DELETE hanya ketika permission memang harus dihapus permanen.

Untuk menonaktifkan permission sementara, gunakan:

```http
PUT /api/master/user-permissions/:id
```

Dengan body:

```json
{
  "is_active": 0
}
```

### Response ketika berhasil

Frontend cukup mengikuti message sukses dari backend dan kemudian refresh list permission.

### Response ketika ID tidak ditemukan

```http
404 Not Found
```

Frontend dapat menampilkan pesan bahwa permission sudah tidak tersedia atau sudah dihapus sebelumnya.

---

# B. NATIONAL HOLIDAY

## 5. Permission yang Dibutuhkan

Seluruh endpoint master National Holiday sekarang wajib diakses oleh user yang memiliki permission aktif:

```text
REPORT_MANAGE
```

Permission dianggap aktif apabila:

- `permission_type = REPORT_MANAGE`
- `is_active = 1`
- `valid_from` kosong atau sudah berlaku
- `valid_until` kosong atau belum kedaluwarsa

---

## 6. Endpoint National Holiday yang Diproteksi

Semua endpoint berikut wajib `REPORT_MANAGE`:

```http
GET    /api/master/national-holidays
GET    /api/master/national-holidays/:id
POST   /api/master/national-holidays
PUT    /api/master/national-holidays/:id
```

Artinya, **GET list dan GET detail juga sudah diproteksi**, bukan hanya create dan update.

---

## 7. GET List National Holiday

### Endpoint

```http
GET /api/master/national-holidays
```

### Permission

```text
REPORT_MANAGE
```

### Contoh request

```http
GET /api/master/national-holidays?year=2026&page=1&limit=20
```

### Query parameter

| Parameter | Keterangan |
|---|---|
| `search` | Pencarian nama holiday |
| `year` | Filter tahun |
| `date_from` | Filter tanggal mulai |
| `date_to` | Filter tanggal akhir |
| `is_active` | Filter status aktif, `1` atau `0` |
| `page` | Nomor halaman |
| `limit` | Jumlah data per halaman, maksimum `100` |

### Contoh Axios

```js
const response = await api.get('/api/master/national-holidays', {
  params: {
    year: 2026,
    page: 1,
    limit: 20,
  },
});

const holidays = response.data.data;
const pagination = response.data.meta;
```

### Contoh response sukses

```json
{
  "success": true,
  "message": "National holidays fetched successfully",
  "data": [
    {
      "id": 1,
      "holiday_date": "2026-08-17",
      "name": "Hari Kemerdekaan Republik Indonesia",
      "multiplier": "2.00",
      "description": "Libur nasional",
      "is_active": 1,
      "created_by": "USER_UUID",
      "updated_by": "USER_UUID",
      "created_at": "2026-08-05T03:00:00.000Z",
      "updated_at": "2026-08-05T03:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 8. GET Detail National Holiday

### Endpoint

```http
GET /api/master/national-holidays/:id
```

### Permission

```text
REPORT_MANAGE
```

### Contoh Axios

```js
const response = await api.get(
  `/api/master/national-holidays/${holidayId}`
);

const holiday = response.data.data;
```

### Ketika data tidak ditemukan

```http
404 Not Found
```

---

## 9. Create National Holiday

### Endpoint

```http
POST /api/master/national-holidays
```

### Permission

```text
REPORT_MANAGE
```

### Contoh body

```json
{
  "holiday_date": "2026-08-17",
  "name": "Hari Kemerdekaan Republik Indonesia",
  "multiplier": 2,
  "description": "Libur nasional",
  "is_active": 1
}
```

### Contoh Axios

```js
await api.post('/api/master/national-holidays', {
  holiday_date: '2026-08-17',
  name: 'Hari Kemerdekaan Republik Indonesia',
  multiplier: 2,
  description: 'Libur nasional',
  is_active: 1,
});
```

### Validasi penting

- `holiday_date` wajib format `YYYY-MM-DD`
- `name` wajib diisi
- `multiplier` harus lebih besar dari `0`
- `is_active` hanya menerima `0` atau `1`
- tanggal holiday tidak boleh duplikat

---

## 10. Update National Holiday

### Endpoint

```http
PUT /api/master/national-holidays/:id
```

### Permission

```text
REPORT_MANAGE
```

Endpoint mendukung partial update.

### Contoh menonaktifkan holiday

```json
{
  "is_active": 0
}
```

### Contoh mengubah multiplier

```json
{
  "multiplier": 1.5,
  "description": "Multiplier diperbarui"
}
```

### Contoh Axios

```js
await api.put(`/api/master/national-holidays/${holidayId}`, {
  multiplier: 1.5,
  description: 'Multiplier diperbarui',
});
```

---

## 11. Response Jika User Tidak Punya REPORT_MANAGE

Apabila user tidak memiliki permission aktif `REPORT_MANAGE`, seluruh endpoint National Holiday di atas akan ditolak.

### HTTP status

```http
403 Forbidden
```

### Bentuk response

```json
{
  "success": false,
  "message": "You are not allowed to manage national holidays"
}
```

Frontend harus menangani status `403`, misalnya dengan:

- menyembunyikan menu National Holiday;
- mencegah user membuka halaman melalui URL langsung;
- menampilkan halaman atau notifikasi `Forbidden` jika backend tetap mengembalikan `403`.

Backend tetap menjadi sumber validasi utama. Menyembunyikan menu di FE bukan pengganti validasi permission backend.

---

## 12. Rekomendasi Visibility Menu FE

Menu National Holiday hanya ditampilkan apabila data user/session menunjukkan user memiliki permission aktif:

```text
REPORT_MANAGE
```

Contoh pemeriksaan sederhana:

```js
const canManageReport = permissions.some(
  (permission) =>
    permission.permission_type === 'REPORT_MANAGE' &&
    Number(permission.is_active) === 1
);
```

Contoh render menu:

```jsx
{canManageReport && (
  <MenuItem to="/master/national-holidays">
    National Holiday
  </MenuItem>
)}
```

Walaupun menu disembunyikan, FE tetap wajib menangani response `403` dari API.

---

## 13. Dampak pada Form Create Overtime

User yang tidak memiliki `REPORT_MANAGE` **tetap dapat membuat request overtime pada tanggal National Holiday**.

Frontend form overtime tidak perlu memanggil endpoint:

```http
GET /api/master/national-holidays
```

untuk menentukan apakah tanggal yang dipilih merupakan libur nasional.

Saat request overtime dikirim, backend melakukan pengecekan langsung ke data master National Holiday secara internal:

```text
work_date dipilih user
→ backend mencari National Holiday aktif pada tanggal tersebut
→ backend menetapkan day_type = NATIONAL_HOLIDAY
→ backend mengambil multiplier holiday
→ backend menghitung dan menyimpan snapshot kompensasi
```

Jadi pembatasan akses GET National Holiday hanya membatasi akses ke halaman/master pengelolaan holiday. Pembatasan tersebut tidak menghalangi validasi internal ketika user biasa membuat overtime.

---

## 14. Catatan Field Request Overtime

Ketika `work_date` termasuk National Holiday aktif, frontend harus membaca nilai final dari response request, bukan menghitung ulang dari master.

Field yang perlu diperhatikan:

```text
day_type
compensation_multiplier
compensation_amount_snapshot
compensation_leave_days_snapshot
final_compensation_amount
final_compensation_leave_days
```

Contoh hasil:

```json
{
  "work_date": "2026-08-17",
  "day_type": "NATIONAL_HOLIDAY",
  "compensation_multiplier": "2.00",
  "compensation_amount_snapshot": "50000.00",
  "final_compensation_amount": "100000.00"
}
```

Frontend tidak perlu melakukan lookup National Holiday untuk menentukan multiplier ketika menampilkan histori request. Gunakan nilai snapshot yang sudah tersimpan pada request.

---

## 15. Error Handling FE

| HTTP status | Kondisi | Tindakan FE |
|---:|---|---|
| `400` | Payload atau validasi tidak sesuai | Tampilkan error field dari response backend |
| `403` | User tidak memiliki `REPORT_MANAGE` | Sembunyikan/keluarkan dari halaman master dan tampilkan Forbidden |
| `404` | Record tidak ditemukan | Refresh list dan tampilkan notifikasi |
| `500` | Error internal | Tampilkan pesan umum dan log detail sesuai mekanisme aplikasi |

---

## 16. Checklist Implementasi FE

### User Permission

- [ ] Gunakan field `is_active`, bukan `status`.
- [ ] PUT dapat mengirim `is_active: 1` atau `is_active: 0`.
- [ ] DELETE digunakan hanya untuk penghapusan permanen.
- [ ] Tampilkan konfirmasi sebelum hard delete.
- [ ] Refresh list setelah update atau delete berhasil.

### National Holiday

- [ ] Menu hanya tampil untuk user dengan `REPORT_MANAGE` aktif.
- [ ] GET list wajib diperlakukan sebagai endpoint terproteksi.
- [ ] GET detail wajib diperlakukan sebagai endpoint terproteksi.
- [ ] POST dan PUT wajib diperlakukan sebagai endpoint terproteksi.
- [ ] Tangani response `403 Forbidden` pada seluruh endpoint National Holiday.
- [ ] Form overtime user biasa tidak perlu memanggil master National Holiday.
- [ ] Gunakan field snapshot request untuk tampilan histori kompensasi.

---

## 17. Daftar Endpoint Final

### User Permission

```http
GET    /api/master/user-permissions
GET    /api/master/user-permissions/:id
POST   /api/master/user-permissions
PUT    /api/master/user-permissions/:id
DELETE /api/master/user-permissions/:id
```

### National Holiday — wajib REPORT_MANAGE

```http
GET  /api/master/national-holidays
GET  /api/master/national-holidays/:id
POST /api/master/national-holidays
PUT  /api/master/national-holidays/:id
```
