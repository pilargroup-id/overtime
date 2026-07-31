# Overtime Frontend Consume Guide

Dokumentasi ini mencakup perubahan terbaru untuk:

- Master **National Holiday**
- Auto-resolve `day_type` menjadi `NATIONAL_HOLIDAY`
- Snapshot nilai kompensasi pada request
- Bulk approve / reject
- Bulk update status Talenta

---

## 0. Update di Tabel

01_create_national_holidays
```sql
CREATE TABLE `national_holidays` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `holiday_date` date NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `multiplier` decimal(5,2) NOT NULL DEFAULT '2.00',
  `description` text COLLATE utf8mb4_general_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` varchar(36) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `updated_by` varchar(36) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_national_holiday_date` (`holiday_date`),
  KEY `idx_national_holiday_active` (`is_active`),
  KEY `idx_national_holiday_date_active` (`holiday_date`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

02_alter_requests_compensation_snapshot
```sql
ALTER TABLE `requests`
  ADD COLUMN `compensation_multiplier` decimal(5,2) NOT NULL DEFAULT '1.00'
    AFTER `compensation_type_id`,
  ADD COLUMN `compensation_amount_snapshot` decimal(15,2) DEFAULT NULL
    AFTER `compensation_multiplier`,
  ADD COLUMN `compensation_leave_days_snapshot` decimal(6,2) DEFAULT NULL
    AFTER `compensation_amount_snapshot`,
  ADD COLUMN `final_compensation_amount` decimal(15,2) DEFAULT NULL
    AFTER `compensation_leave_days_snapshot`,
  ADD COLUMN `final_compensation_leave_days` decimal(6,2) DEFAULT NULL
    AFTER `final_compensation_amount`;

-- Backfill request lama dengan nilai master saat migration dijalankan.
-- Request lama menggunakan multiplier 1.00 karena belum memiliki riwayat multiplier.
UPDATE `requests` r
INNER JOIN `compensation_types` ct ON ct.id = r.compensation_type_id
SET
  r.compensation_multiplier = 1.00,
  r.compensation_amount_snapshot = ct.amount,
  r.compensation_leave_days_snapshot = ct.leave_days,
  r.final_compensation_amount = ct.amount,
  r.final_compensation_leave_days = ct.leave_days
WHERE
  r.compensation_amount_snapshot IS NULL
  AND r.compensation_leave_days_snapshot IS NULL;

```



## 1. Base URL

Development dengan Vite proxy:

```js
const api = axios.create({
  baseURL: '/api',
})
```

Contoh endpoint penuh:

```text
/api/master/national-holidays
/api/overtime/requests
/api/overtime/approvals
/api/overtime/reports
```

Semua endpoint menggunakan authentication aplikasi Overtime.

---

# 2. Master National Holiday

## 2.1 List National Holiday

```http
GET /api/master/national-holidays
```

Query yang dapat digunakan:

```text
page
limit
search
year
is_active
```

Contoh:

```http
GET /api/master/national-holidays?year=2026&page=1&limit=20
```

Contoh response:

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
      "created_by": "bd625aff-7fc4-44e9-b95c-549f99f47991",
      "updated_by": null,
      "created_at": "2026-07-31T02:00:00.000Z",
      "updated_at": "2026-07-31T02:00:00.000Z"
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

Endpoint list dapat diakses semua user yang mempunyai akses aplikasi Overtime.

---

## 2.2 Detail National Holiday

```http
GET /api/master/national-holidays/:id
```

Contoh:

```http
GET /api/master/national-holidays/1
```

---

## 2.3 Create National Holiday

```http
POST /api/master/national-holidays
```

Hanya user dengan permission aktif:

```text
REPORT_MANAGE
```

Body:

```json
{
  "holiday_date": "2026-08-17",
  "name": "Hari Kemerdekaan Republik Indonesia",
  "multiplier": 2,
  "description": "Libur nasional",
  "is_active": 1
}
```

Keterangan:

- `holiday_date`: format `YYYY-MM-DD`
- `name`: nama hari libur
- `multiplier`: angka lebih dari `0`, dapat berupa `1.5`, `2`, `3`, dan seterusnya
- `description`: opsional
- `is_active`: `1` aktif, `0` nonaktif

---

## 2.4 Update National Holiday

```http
PUT /api/master/national-holidays/:id
```

Hanya user dengan permission aktif `REPORT_MANAGE`.

Contoh body:

```json
{
  "multiplier": 1.5,
  "description": "Multiplier diperbarui",
  "is_active": 1
}
```

---

# 3. Perubahan Day Type

Pilihan day type di FE cukup menampilkan:

```text
WORKDAY
HOLIDAY
WEEKEND
```

Jangan tampilkan `NATIONAL_HOLIDAY` sebagai pilihan manual user.

Backend akan melakukan pengecekan berdasarkan `work_date`.

Jika tanggal request ditemukan pada master `national_holidays` yang aktif, backend otomatis:

```text
day_type = NATIONAL_HOLIDAY
```

Nilai day type yang dikirim FE akan dioverride oleh backend.

Contoh request FE:

```json
{
  "day_type": "WORKDAY",
  "work_date": "2026-08-17",
  "start_time": "18:00",
  "end_time": "20:00",
  "task_description": "Maintenance server",
  "result_description": "Maintenance selesai",
  "compensation_type_id": 1
}
```

Jika `2026-08-17` terdaftar sebagai National Holiday, response request akan menyimpan:

```json
{
  "day_type": "NATIONAL_HOLIDAY",
  "compensation_multiplier": "2.00"
}
```

FE tidak perlu menghitung multiplier sendiri.

---

# 4. Field Kompensasi Terbaru pada Request

Nilai histori kompensasi sekarang disimpan sebagai snapshot pada tabel `requests`.

Field terbaru:

```text
compensation_multiplier
compensation_amount_snapshot
compensation_leave_days_snapshot
final_compensation_amount
final_compensation_leave_days
```

## 4.1 Untuk Kompensasi MONEY

Gunakan:

```text
compensation_amount_snapshot
compensation_multiplier
final_compensation_amount
```

Contoh:

```json
{
  "compensation_kind": "MONEY",
  "compensation_amount_snapshot": "100000.00",
  "compensation_multiplier": "2.00",
  "final_compensation_amount": "200000.00"
}
```

Tampilan FE yang disarankan:

```text
Nilai Dasar : Rp100.000
Multiplier  : 2x
Total       : Rp200.000
```

---

## 4.2 Untuk Kompensasi LEAVE

Gunakan:

```text
compensation_leave_days_snapshot
compensation_multiplier
final_compensation_leave_days
```

Contoh:

```json
{
  "compensation_kind": "LEAVE",
  "compensation_leave_days_snapshot": "1.00",
  "compensation_multiplier": "1.50",
  "final_compensation_leave_days": "1.50"
}
```

Tampilan FE yang disarankan:

```text
Cuti Dasar  : 1 hari
Multiplier  : 1.5x
Total       : 1.5 hari
```

---

## 4.3 Jangan Gunakan Nilai Master untuk Histori

Field berikut masih dapat tersedia untuk compatibility:

```text
compensation_amount
compensation_leave_days
```

Tetapi untuk halaman:

- detail request
- approval
- report
- histori

FE harus menggunakan field snapshot dan field final dari request.

Alasannya, nilai pada master `compensation_types` dapat berubah di masa depan, sedangkan request lama harus tetap menampilkan nilai saat request dibuat.

Fallback yang aman untuk data lama:

```js
const baseAmount =
  request.compensation_amount_snapshot ?? request.compensation_amount ?? null

const baseLeaveDays =
  request.compensation_leave_days_snapshot ?? request.compensation_leave_days ?? null

const multiplier = Number(request.compensation_multiplier ?? 1)

const finalAmount =
  request.final_compensation_amount ??
  (baseAmount !== null ? Number(baseAmount) * multiplier : null)

const finalLeaveDays =
  request.final_compensation_leave_days ??
  (baseLeaveDays !== null ? Number(baseLeaveDays) * multiplier : null)
```

Fallback hanya untuk mengantisipasi data request lama sebelum kolom snapshot tersedia.

---

# 5. Bulk Approve

## Endpoint

```http
PUT /api/overtime/approvals/bulk/approve
```

Body:

```json
{
  "ids": [1, 2, 3],
  "note": "Bulk approve lembur"
}
```

`ids` berisi ID dari tabel/response approval, bukan request ID.

Maksimal:

```text
100 approval IDs per request
```

Contoh response:

```json
{
  "success": true,
  "message": "Overtime requests approved successfully",
  "data": {
    "count": 3,
    "data": [
      {
        "id": 1,
        "request_id": 10,
        "status": "APPROVED",
        "request_status": "APPROVED"
      }
    ]
  }
}
```

Syarat setiap item:

- approval dimiliki user login sebagai approver
- approval masih `PENDING`
- request masih `SUBMITTED`

Bulk approval bersifat satu transaksi. Jika satu ID tidak valid, proses seluruh batch gagal.

---

# 6. Bulk Reject

## Endpoint

```http
PUT /api/overtime/approvals/bulk/reject
```

Body:

```json
{
  "ids": [4, 5],
  "note": "Data lembur belum sesuai"
}
```

`ids` adalah approval IDs.

Syarat sama seperti bulk approve:

- approver harus user login
- status approval `PENDING`
- status request `SUBMITTED`

---

# 7. Contoh FE Bulk Approval

```js
async function bulkApprove(approvalIds, note = null) {
  const response = await api.put('/overtime/approvals/bulk/approve', {
    ids: approvalIds,
    note,
  })

  return response.data
}

async function bulkReject(approvalIds, note = null) {
  const response = await api.put('/overtime/approvals/bulk/reject', {
    ids: approvalIds,
    note,
  })

  return response.data
}
```

Contoh penggunaan checkbox:

```js
const selectedApprovalIds = selectedRows.map((row) => row.id)

await bulkApprove(selectedApprovalIds, 'Approved dari halaman approval')
```

Pastikan row berasal dari endpoint approval, sehingga `row.id` adalah approval ID.

---

# 8. Bulk Update Talenta Status

## Endpoint

```http
PUT /api/overtime/reports/talenta-status/bulk
```

Endpoint ini hanya dapat digunakan user dengan permission aktif:

```text
REPORT_MANAGE
```

Body untuk menandai sudah diproses:

```json
{
  "ids": [10, 11, 12],
  "talenta_status": "PROCESSED",
  "note": "Sudah diproses di Talenta"
}
```

Body untuk mengembalikan ke pending:

```json
{
  "ids": [10, 11],
  "talenta_status": "PENDING",
  "note": "Dikembalikan ke pending"
}
```

`ids` berisi request IDs, bukan approval IDs.

Syarat:

- semua request harus ditemukan
- semua request harus mempunyai status `APPROVED`
- user harus mempunyai permission `REPORT_MANAGE`

Contoh response:

```json
{
  "success": true,
  "message": "Talenta status bulk updated successfully",
  "data": {
    "updated_ids": [10, 11, 12],
    "talenta_status": "PROCESSED",
    "total_updated": 3
  }
}
```

Ketika status menjadi `PROCESSED`, backend otomatis mengisi:

```text
talenta_processed_by
talenta_processed_at
```

Ketika status dikembalikan menjadi `PENDING`, `talenta_processed_at` akan dikosongkan kembali.

---

# 9. Contoh FE Bulk Talenta

```js
async function bulkUpdateTalentaStatus(requestIds, talentaStatus, note = null) {
  const response = await api.put('/overtime/reports/talenta-status/bulk', {
    ids: requestIds,
    talenta_status: talentaStatus,
    note,
  })

  return response.data
}
```

Contoh penggunaan:

```js
const selectedRequestIds = selectedRows.map((row) => row.id)

await bulkUpdateTalentaStatus(
  selectedRequestIds,
  'PROCESSED',
  'Sudah diinput ke Talenta'
)
```

Pada halaman report, `row.id` adalah request ID.

---

# 10. Perbedaan ID Bulk Approval dan Bulk Talenta

| Proses | Endpoint | Isi `ids` |
|---|---|---|
| Bulk Approve | `/overtime/approvals/bulk/approve` | Approval IDs |
| Bulk Reject | `/overtime/approvals/bulk/reject` | Approval IDs |
| Bulk Talenta | `/overtime/reports/talenta-status/bulk` | Request IDs |

Jangan menukar approval ID dan request ID.

Response endpoint approval biasanya mempunyai:

```json
{
  "id": 5,
  "request_id": 20
}
```

Untuk bulk approve/reject gunakan:

```text
id = 5
```

Untuk bulk Talenta gunakan:

```text
request_id = 20
```

---

# 11. Single Talenta Status

Endpoint single tetap tersedia:

```http
PUT /api/overtime/reports/:id/talenta-status
```

`:id` adalah request ID.

Body:

```json
{
  "talenta_status": "PROCESSED",
  "note": "Sudah diproses"
}
```

---

# 12. Error Handling FE

Contoh error validasi:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "ids": "At least one approval id is required"
  }
}
```

Contoh handling:

```js
try {
  await bulkApprove(selectedIds)
} catch (error) {
  const message =
    error.response?.data?.errors?.ids ||
    error.response?.data?.message ||
    'Gagal memproses data'

  console.error(message)
}
```

Setelah bulk action berhasil, refresh ulang list dari server agar status row konsisten.

---

# 13. Checklist Implementasi FE

- Hilangkan pilihan manual `NATIONAL_HOLIDAY` dari form request.
- Tetap kirim `day_type` biasa: `WORKDAY`, `HOLIDAY`, atau `WEEKEND`.
- Jangan menghitung multiplier di FE.
- Tampilkan `day_type` dari response backend setelah request tersimpan.
- Gunakan field snapshot untuk histori kompensasi.
- Gunakan field final untuk total kompensasi.
- Bulk approve/reject mengirim approval IDs.
- Bulk Talenta mengirim request IDs.
- Disable tombol bulk jika tidak ada row yang dipilih.
- Refresh list setelah bulk action berhasil.

