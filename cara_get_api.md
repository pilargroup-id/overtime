# Cara ambil `Approval Time`

Kolom `Approval Time` di [`frontend/src/components/table/dekstop/DataTableApprovalOvertime.jsx`](frontend/src/components/table/dekstop/DataTableApprovalOvertime.jsx) mengambil data dari endpoint:

```http
GET /api/overtime/approvals
```

## Endpoint yang dipakai

Frontend memakai helper yang sudah ada di [`frontend/src/services/api.js`](frontend/src/services/api.js):

```js
api.overtimeApprovals.list({
  page: currentPage,
limit: pageSize,
  search: searchQuery,
})
```

Endpoint ini akan mengembalikan daftar approval milik approver yang sedang login.

## Field untuk `Approval Time`

Field utama yang dipakai adalah:

```json
{
  "request_id": 123,
  "acted_at": "2026-06-29T08:15:00.000Z"
}
```

Penjelasan:

- `request_id` dipakai untuk mencocokkan data approval dengan row request di tabel.
- `acted_at` dipakai sebagai nilai utama untuk kolom `Approval Time`.
- Jika `acted_at` kosong, komponen menyiapkan fallback ke `approved_at`, `rejected_at`, lalu `updated_at`.

## Alur singkat di komponen

1. Tabel tetap mengambil daftar request dari `GET /api/overtime/requests`.
2. Komponen juga memanggil `GET /api/overtime/approvals`.
3. Data approval disimpan ke `Map` dengan key `request_id`.
4. Kolom `Approval Time` menampilkan waktu approval berdasarkan data tersebut.

## Contoh hasil tampilan

Jika API approval mengembalikan:

```json
{
  "id": 77,
  "request_id": 12,
  "status": "APPROVED",
  "acted_at": "2026-06-29T08:15:00.000Z"
}
```

Maka kolom `Approval Time` akan tampil seperti:

```text
29 Jun 2026, 08.15
```
