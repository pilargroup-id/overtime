# Cara Ambil Data ke `DataTableApprovalOvertime`

Dokumen ini menjelaskan alur data untuk menampilkan isi tabel di [`frontend/src/components/table/dekstop/DataTableApprovalOvertime.jsx`](frontend/src/components/table/dekstop/DataTableApprovalOvertime.jsx), termasuk kolom `Approval Time`.

## Ringkasnya

`DataTableApprovalOvertime`:

1. memanggil endpoint approval lewat helper API,
2. menyimpan hasil response ke state `approvalRows`,
3. mengirim `approvalRows` ke komponen `DataTable` lewat prop `rows`,
4. me-render setiap kolom dari data row yang sudah diterima.

Jadi, data tidak diisi manual ke tabel. Data masuk dari API, disimpan dulu ke state, lalu state itu yang dipakai sebagai sumber baris tabel.

## Endpoint yang dipakai

Komponen memakai helper yang sudah ada di [`frontend/src/services/api.js`](frontend/src/services/api.js):

```js
api.overtimeApprovals.list({
  page: currentPage,
  limit: pageSize,
  search: searchQuery,
})
```

Helper ini akan mengarah ke:

```http
GET /api/overtime/approvals
```

Endpoint tersebut mengembalikan daftar approval milik user yang sedang login.

## Alur data di komponen

### 1. State tabel disiapkan

Di komponen ada state:

```js
const [approvalRows, setApprovalRows] = useState([])
```

State ini adalah tempat sementara untuk menyimpan data hasil API.

### 2. Data diambil saat komponen load

Komponen menjalankan `useEffect` untuk fetch data:

```js
useEffect(() => {
  const loadApprovals = async () => {
    const response = await api.overtimeApprovals.list({
      page: currentPage,
      limit: pageSize,
      search: searchQuery,
    })

    const rows = normalizeResponseRows(response)
    const meta = normalizeResponseMeta(response, rows.length, pageSize)

    setApprovalRows(rows)
    setTotalItems(meta.total)
    setTotalPages(meta.totalPages)
  }

  loadApprovals()
}, [currentPage, pageSize, refreshKey, reloadKey, searchQuery])
```

Artinya:

- kalau halaman berubah, data diambil ulang,
- kalau ukuran halaman berubah, data diambil ulang,
- kalau search berubah, data diambil ulang,
- kalau `refreshKey` atau `reloadKey` berubah, data juga diambil ulang.

### 3. Response API dinormalisasi

Supaya tabel tetap aman walaupun bentuk response sedikit beda, komponen memanggil:

```js
normalizeResponseRows(response)
```

Fungsi ini bisa membaca beberapa format response:

- `response.data`
- `response.rows`
- `response.results`
- atau array langsung

Jadi yang disimpan ke `approvalRows` selalu berupa array row yang siap ditampilkan di tabel.

### 4. Data dimasukkan ke tabel

Setelah state terisi, tabel menerima data lewat prop:

```jsx
<DataTable
  rows={approvalRows}
  columns={columns}
  ...
/>
```

Inilah titik utama data masuk ke UI tabel.

## Cara kolom `Approval Time` diambil

Kolom ini tidak mengambil data dari request utama, tetapi dari data approval yang sudah ada di row.

Field yang dipakai:

```json
{
  "request_id": 123,
  "acted_at": "2026-06-29T08:15:00.000Z"
}
```

Penjelasan field:

- `request_id` dipakai sebagai penghubung antara approval dan request.
- `acted_at` dipakai sebagai waktu approval utama.
- jika `acted_at` kosong, komponen akan fallback ke `approved_at`, `rejected_at`, lalu `updated_at`.

Di kode:

```js
function getApprovalTimeValue(row) {
  return row?.acted_at ?? row?.approved_at ?? row?.rejected_at ?? row?.updated_at ?? null
}
```

Lalu nilainya diformat dengan:

```js
formatDateTime(getApprovalTimeValue(row))
```

## Langkah praktik

Kalau kamu ingin mengikuti alur ini, urutannya seperti berikut:

1. Pastikan helper API sudah tersedia di [`frontend/src/services/api.js`](frontend/src/services/api.js).
2. Panggil endpoint approval dengan parameter `page`, `limit`, dan `search`.
3. Ambil response lalu ubah menjadi array row yang konsisten.
4. Simpan array tersebut ke state `approvalRows`.
5. Kirim `approvalRows` ke `DataTable` lewat prop `rows`.
6. Di definisi kolom, ambil field yang diperlukan, misalnya `acted_at` untuk `Approval Time`.

## Contoh alur data

Misalnya API mengembalikan:

```json
{
  "id": 77,
  "request_id": 12,
  "status": "APPROVED",
  "acted_at": "2026-06-29T08:15:00.000Z"
}
```

Maka prosesnya:

1. data masuk ke `approvalRows`,
2. `DataTable` merender baris tersebut,
3. kolom `Approval Time` membaca `acted_at`,
4. nilai ditampilkan menjadi:

```text
29 Jun 2026, 08.15
```

## Catatan tambahan

- Komponen juga memuat data `compensationTypes` untuk menampilkan label `Compensation`.
- Aksi `Approve` dan `Reject` akan update data row, lalu memicu reload data agar tabel tetap sinkron.
