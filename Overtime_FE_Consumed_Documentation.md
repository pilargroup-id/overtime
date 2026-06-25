# Overtime FE Consumed API Documentation

Dokumentasi ini dibuat untuk kebutuhan development Frontend Overtime App. Backend sudah menggunakan central auth Pilar Group dan domain database `overtime`.

---

## 1. Aktivasi Tunnel Dulu

Sebelum menjalankan backend local, aktifkan SSH tunnel ke database VM.

```bash
ssh -i ~/.ssh/id_ed25519 -N -L 3307:127.0.0.1:3306 azi@ssh.pilargroup.id
```

Catatan:

- Biarkan terminal tunnel tetap terbuka selama development.
- Jika backend local tidak bisa connect DB, cek dulu apakah tunnel masih aktif.
- Port local DB tunnel adalah `3307`.
- MySQL remote tetap diarahkan ke `127.0.0.1:3306` dari sisi server.

---

## 2. Base API

Local backend:

```txt
http://localhost:3000/api
```

Contoh pemakaian FE:

```js
const API_BASE_URL = 'http://localhost:3000/api';
```

---

## 3. Auth & Header

Semua endpoint overtime wajib memakai auth central Pilar Group.

Header umum:

```http
Content-Type: application/json
Authorization: Bearer <CENTRAL_AUTH_TOKEN>
```

Jika backend local sedang menggunakan dev auth, `Authorization` bisa saja tidak dibutuhkan, tergantung config backend.

---

## 4. Standard Response Shape

### Success

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

### Success with Pagination

```json
{
  "success": true,
  "message": "OK",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 1
  }
}
```

### Error Validation / Bad Request

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "field_name": "Error message"
  }
}
```

### Forbidden

```json
{
  "success": false,
  "message": "You are not allowed to access this resource"
}
```

---

## 5. Important Enum Reference

### Request Status

```txt
SUBMITTED
APPROVED
REJECTED
CANCELED
```

Catatan: gunakan `CANCELED` dengan single `L`.

### Approval Status

```txt
PENDING
APPROVED
REJECTED
CANCELED
```

### Day Type

```txt
WORKDAY
HOLIDAY
WEEKEND
NATIONAL_HOLIDAY
```

### Talenta Status

```txt
PENDING
PROCESSED
```

### Source Type

```txt
SELF
SCOPED_INPUT
ALL_INPUT
```

| source_type | Arti |
|---|---|
| `SELF` | User submit form lembur untuk dirinya sendiri |
| `SCOPED_INPUT` | User submit form lembur untuk orang lain berdasarkan permission scoped |
| `ALL_INPUT` | User submit form lembur untuk orang lain dengan akses all user |

### User Permission Type

```txt
REQUEST_CREATE_SCOPED
REQUEST_CREATE_ALL
REPORT_MANAGE
```

| permission_type | scope_type yang valid | Arti |
|---|---|---|
| `REQUEST_CREATE_SCOPED` | `COMPANY` / `DEPARTMENT` | Bisa input lembur orang lain sesuai scope |
| `REQUEST_CREATE_ALL` | `GLOBAL` | Bisa input lembur semua user |
| `REPORT_MANAGE` | `GLOBAL` | Bisa akses report dan update status Talenta |

### Permission Scope Type

```txt
GLOBAL
COMPANY
DEPARTMENT
```

---

## 6. Auth Endpoint

## 6.1 Get Current User

```http
GET /api/auth/me
```

Contoh response:

```json
{
  "success": true,
  "message": "Authenticated",
  "data": {
    "id": "user-id",
    "internal_id": "EMP001",
    "username": "andi",
    "email": "andi@pilargroup.id",
    "name": "Andi Saputra",
    "job_position": "Staff IT",
    "job_level_id": 8,
    "employment_type_code": "UP",
    "department_id": 8,
    "department_name": "IT",
    "department_code": "SIT",
    "company_id": "comp-pnm-0001",
    "company_code": "PNM",
    "company_name": "PT Pilar Niaga Makmur",
    "apps": ["overtime"]
  }
}
```

FE bisa memakai endpoint ini untuk:

- Cek user login.
- Cek app access.
- Menampilkan profile user.
- Menentukan default employee ketika user input form sendiri.

---

## 7. Eligible Employees untuk Form Input

Endpoint ini penting untuk FE form lembur. Jangan pakai all users mentah dari PilarGroup untuk dropdown input lembur, supaya user tidak salah pilih employee di luar aksesnya.

### 7.1 Get Eligible Employees

```http
GET /api/overtime/requests/eligible-employees
```

Query optional:

| Query | Type | Keterangan |
|---|---:|---|
| `search` | string | Search by name, username, internal_id, email |
| `limit` | number | Default 20 |

Contoh:

```http
GET /api/overtime/requests/eligible-employees?search=andi&limit=20
```

Behavior:

| Permission user login | Employee yang muncul |
|---|---|
| Tanpa permission input orang lain | Hanya user login sendiri |
| `REQUEST_CREATE_SCOPED + DEPARTMENT` | User di department yang diizinkan + user login sendiri |
| `REQUEST_CREATE_SCOPED + COMPANY` | User di company yang diizinkan + user login sendiri |
| `REQUEST_CREATE_ALL + GLOBAL` | Semua active user |
| `REPORT_MANAGE` | Tidak berpengaruh untuk input form |

Contoh response:

```json
{
  "success": true,
  "message": "Eligible employees fetched successfully",
  "data": [
    {
      "id": "user-id-001",
      "internal_id": "EMP001",
      "username": "andi",
      "name": "Andi Saputra",
      "email": "andi@pilargroup.id",
      "job_position": "Staff IT",
      "employment_type_code": "UP",
      "job_level_name": "Staff",
      "job_level_value": 1,
      "department_id": 8,
      "department_name": "IT",
      "department_code": "SIT",
      "company_id": "comp-pnm-0001",
      "company_code": "PNM",
      "company_name": "PT Pilar Niaga Makmur"
    }
  ]
}
```

---

## 8. Master Compensation Types

Digunakan untuk pilihan kompensasi lembur di form.

### 8.1 List Compensation Types

```http
GET /api/master/compensation-types
```

Query optional:

| Query | Type | Keterangan |
|---|---:|---|
| `search` | string | Search code/name |
| `compensation_kind` | string | `MONEY` / `LEAVE` |
| `is_active` | number | `1` / `0` |
| `page` | number | Default 1 |
| `limit` | number | Default 10 |

Contoh:

```http
GET /api/master/compensation-types?is_active=1&limit=100
```

Contoh response item:

```json
{
  "id": 1,
  "code": "MONEY_100K",
  "name": "Uang Lembur 100.000",
  "compensation_kind": "MONEY",
  "amount": "100000.00",
  "leave_days": null,
  "description": "Kompensasi uang lembur sebesar 100.000",
  "is_active": 1
}
```

### 8.2 Create Compensation Type

```http
POST /api/master/compensation-types
```

Body MONEY:

```json
{
  "code": "MONEY_100K",
  "name": "Uang Lembur 100.000",
  "compensation_kind": "MONEY",
  "amount": 100000,
  "leave_days": null,
  "description": "Kompensasi uang lembur sebesar 100.000",
  "is_active": 1
}
```

Body LEAVE:

```json
{
  "code": "LEAVE_HALF_DAY",
  "name": "Cuti Pengganti 1/2 Hari",
  "compensation_kind": "LEAVE",
  "amount": null,
  "leave_days": 0.5,
  "description": "Kompensasi cuti pengganti setengah hari",
  "is_active": 1
}
```

### 8.3 Detail Compensation Type

```http
GET /api/master/compensation-types/:id
```

### 8.4 Update Compensation Type

```http
PUT /api/master/compensation-types/:id
```

Body sama seperti create.

---

## 9. Master User Permissions

Digunakan untuk mengatur akses tambahan user di app overtime.

### 9.1 List User Permissions

```http
GET /api/master/user-permissions
```

Query optional:

| Query | Type | Keterangan |
|---|---:|---|
| `user_id` | string | Filter by user |
| `permission_type` | string | `REQUEST_CREATE_SCOPED` / `REQUEST_CREATE_ALL` / `REPORT_MANAGE` |
| `scope_type` | string | `GLOBAL` / `COMPANY` / `DEPARTMENT` |
| `company_id` | string | Filter company |
| `department_id` | number | Filter department |
| `is_active` | number | `1` / `0` |
| `page` | number | Default 1 |
| `limit` | number | Default 10 |

### 9.2 Create Permission: Scoped Department Input

```http
POST /api/master/user-permissions
```

```json
{
  "user_id": "USER_ID",
  "permission_type": "REQUEST_CREATE_SCOPED",
  "scope_type": "DEPARTMENT",
  "company_id": "comp-pnm-0001",
  "department_id": 8,
  "is_active": 1,
  "valid_from": null,
  "valid_until": null
}
```

### 9.3 Create Permission: Scoped Company Input

```json
{
  "user_id": "USER_ID",
  "permission_type": "REQUEST_CREATE_SCOPED",
  "scope_type": "COMPANY",
  "company_id": "comp-pnm-0001",
  "department_id": null,
  "is_active": 1,
  "valid_from": null,
  "valid_until": null
}
```

### 9.4 Create Permission: All User Input

```json
{
  "user_id": "USER_ID",
  "permission_type": "REQUEST_CREATE_ALL",
  "scope_type": "GLOBAL",
  "company_id": null,
  "department_id": null,
  "is_active": 1,
  "valid_from": null,
  "valid_until": null
}
```

### 9.5 Create Permission: Report Manage

```json
{
  "user_id": "USER_ID",
  "permission_type": "REPORT_MANAGE",
  "scope_type": "GLOBAL",
  "company_id": null,
  "department_id": null,
  "is_active": 1,
  "valid_from": null,
  "valid_until": null
}
```

### 9.6 Detail User Permission

```http
GET /api/master/user-permissions/:id
```

### 9.7 Update User Permission

```http
PUT /api/master/user-permissions/:id
```

---

## 10. Master Approval Rules

Digunakan untuk konfigurasi arah approval.

### 10.1 List Approval Rules

```http
GET /api/master/approval-rules
```

Query optional:

| Query | Type | Keterangan |
|---|---:|---|
| `search` | string | Search code/name |
| `department_id` | number | Department requester |
| `approver_scope_type` | string | `SAME_DEPARTMENT` / `GLOBAL` / `SPECIFIC_DEPARTMENT` |
| `is_active` | number | `1` / `0` |
| `page` | number | Default 1 |
| `limit` | number | Default 10 |

### 10.2 Create Rule Staff to Manager

```http
POST /api/master/approval-rules
```

```json
{
  "code": "STAFF_TO_MANAGER",
  "name": "Staff to Manager",
  "requester_min_job_level_value": 1,
  "requester_max_job_level_value": 3,
  "department_id": null,
  "approver_scope_type": "SAME_DEPARTMENT",
  "approver_department_id": null,
  "approver_job_level_name": "Manager",
  "approval_type": "STAFF_TO_MANAGER",
  "priority": 100,
  "is_active": 1
}
```

### 10.3 Create Rule Managerial IT to Finance Director

```json
{
  "code": "MANAGERIAL_IT_TO_FINANCE_DIRECTOR",
  "name": "Managerial IT to Finance Director",
  "requester_min_job_level_value": 4,
  "requester_max_job_level_value": 7,
  "department_id": 8,
  "approver_scope_type": "GLOBAL",
  "approver_department_id": null,
  "approver_job_level_name": "Finance Director",
  "approval_type": "MANAGERIAL_TO_FINANCE_DIRECTOR",
  "priority": 10,
  "is_active": 1
}
```

### 10.4 Create Rule Managerial Default to President Director

```json
{
  "code": "MANAGERIAL_TO_PRESIDENT_DIRECTOR",
  "name": "Managerial to President Director",
  "requester_min_job_level_value": 4,
  "requester_max_job_level_value": 7,
  "department_id": null,
  "approver_scope_type": "GLOBAL",
  "approver_department_id": null,
  "approver_job_level_name": "President Director",
  "approval_type": "MANAGERIAL_TO_PRESIDENT_DIRECTOR",
  "priority": 100,
  "is_active": 1
}
```

### 10.5 Detail Approval Rule

```http
GET /api/master/approval-rules/:id
```

### 10.6 Update Approval Rule

```http
PUT /api/master/approval-rules/:id
```

---

## 11. Overtime Requests

Request lembur utama. Satu row request selalu untuk satu employee.

Bulk input bukan berarti satu request punya banyak employee, tetapi shortcut untuk membuat banyak request sekaligus.

```txt
1 employee = 1 request row
1 employee = 1 request_number
1 employee = 1 approval row
1 employee = 1 Talenta status
```

### 11.1 List My Requests

```http
GET /api/overtime/requests
```

Endpoint ini untuk daftar request milik user login, yaitu request yang user submit atau request yang employee-nya adalah user login.

Query optional:

| Query | Type | Keterangan |
|---|---:|---|
| `search` | string | Search request number / employee name / description |
| `status` | string | `SUBMITTED` / `APPROVED` / `REJECTED` / `CANCELED` |
| `talenta_status` | string | `PENDING` / `PROCESSED` |
| `work_date_from` | date | `YYYY-MM-DD` |
| `work_date_to` | date | `YYYY-MM-DD` |
| `page` | number | Default 1 |
| `limit` | number | Default 10 |

Contoh:

```http
GET /api/overtime/requests?status=SUBMITTED&talenta_status=PENDING&page=1&limit=10
```

### 11.2 Submit Request Self / Single Employee

```http
POST /api/overtime/requests
```

Body submit untuk diri sendiri:

```json
{
  "day_type": "WORKDAY",
  "work_date": "2026-06-24",
  "start_time": "18:00",
  "end_time": "21:00",
  "task_description": "Menyelesaikan closing data overtime dan validasi approval flow",
  "result_description": "Data closing selesai divalidasi dan siap dilanjutkan ke approval",
  "compensation_type_id": 1
}
```

Body submit untuk orang lain:

```json
{
  "employee_id": "USER_ID_EMPLOYEE",
  "day_type": "WEEKEND",
  "work_date": "2026-06-21",
  "start_time": "09:00",
  "end_time": "13:00",
  "task_description": "Stock opname dan pengecekan selisih barang gudang",
  "result_description": "Stock opname selesai dan selisih barang sudah direkap",
  "compensation_type_id": 1
}
```

Response expected:

```json
{
  "success": true,
  "message": "Overtime request submitted successfully",
  "data": {
    "id": 1,
    "request_number": "OVT-SIT-26-00001",
    "source_type": "SELF",
    "employee_id": "USER_ID_EMPLOYEE",
    "day_type": "WORKDAY",
    "work_date": "2026-06-24",
    "start_time": "18:00:00",
    "end_date": "2026-06-24",
    "end_time": "21:00:00",
    "total_minutes": 180,
    "status": "SUBMITTED",
    "talenta_status": "PENDING",
    "approval_type": "STAFF_TO_MANAGER",
    "current_approver_id": "USER_ID_APPROVER"
  }
}
```

### 11.3 Submit Cross Day

Jika `end_time` lebih kecil dari `start_time` dan `end_date` tidak dikirim, backend otomatis set `end_date = work_date + 1 day`.

```json
{
  "day_type": "WORKDAY",
  "work_date": "2026-06-24",
  "start_time": "22:00",
  "end_time": "02:00",
  "task_description": "Monitoring deployment production dan pengecekan service setelah restart",
  "result_description": "Deployment selesai dan seluruh service berjalan normal",
  "compensation_type_id": 1
}
```

Expected:

```json
{
  "work_date": "2026-06-24",
  "start_time": "22:00:00",
  "end_date": "2026-06-25",
  "end_time": "02:00:00",
  "total_minutes": 240
}
```

### 11.4 Submit Bulk Request

```http
POST /api/overtime/requests/bulk
```

Body:

```json
{
  "employee_ids": [
    "USER_ID_001",
    "USER_ID_002",
    "USER_ID_003"
  ],
  "day_type": "WORKDAY",
  "work_date": "2026-06-24",
  "start_time": "18:00",
  "end_time": "21:00",
  "task_description": "Monitoring deployment production dan pengecekan service setelah restart",
  "result_description": "Deployment selesai dan seluruh service berjalan normal",
  "compensation_type_id": 1
}
```

Response jika sebagian / semua sukses:

```json
{
  "success": true,
  "message": "Bulk overtime requests processed",
  "data": {
    "total": 3,
    "success_count": 2,
    "failed_count": 1,
    "success_items": [
      {
        "employee_id": "USER_ID_001",
        "request_id": 12,
        "request_number": "OVT-SIT-26-00012",
        "source_type": "ALL_INPUT",
        "status": "SUBMITTED",
        "current_approver_id": "USER_ID_APPROVER",
        "approval_type": "STAFF_TO_MANAGER"
      }
    ],
    "failed_items": [
      {
        "employee_id": "USER_ID_003",
        "message": "You are not allowed to submit overtime request for this employee",
        "errors": null
      }
    ]
  }
}
```

Response jika semua gagal:

```json
{
  "success": false,
  "message": "Bulk overtime requests failed",
  "errors": {
    "total": 3,
    "success_count": 0,
    "failed_count": 3,
    "success_items": [],
    "failed_items": [
      {
        "employee_id": "USER_ID_001",
        "message": "You are not allowed to submit overtime request for this employee",
        "errors": null
      }
    ]
  }
}
```

### 11.5 Detail Request

```http
GET /api/overtime/requests/:id
```

### 11.6 Cancel Request

```http
PUT /api/overtime/requests/:id/cancel
```

Body:

```json
{
  "note": "Pengajuan dibatalkan karena jadwal lembur berubah"
}
```

Expected:

```json
{
  "success": true,
  "message": "Overtime request canceled successfully",
  "data": {
    "id": 1,
    "status": "CANCELED",
    "canceled_at": "2026-06-24T10:00:00.000Z"
  }
}
```

Cancel hanya bisa dilakukan ketika request masih `SUBMITTED`.

---

## 12. Overtime Approvals

Endpoint approval hanya untuk approver yang sedang login.

### 12.1 List My Approvals

```http
GET /api/overtime/approvals
```

Query optional:

| Query | Type | Keterangan |
|---|---:|---|
| `status` | string | Approval status: `PENDING` / `APPROVED` / `REJECTED` / `CANCELED` |
| `request_status` | string | Request status |
| `department_id` | number | Filter department employee |
| `employee_id` | string | Filter employee |
| `work_date_from` | date | `YYYY-MM-DD` |
| `work_date_to` | date | `YYYY-MM-DD` |
| `search` | string | Search request number / employee name |
| `page` | number | Default 1 |
| `limit` | number | Default 10 |

Contoh:

```http
GET /api/overtime/approvals?status=PENDING&request_status=SUBMITTED
```

### 12.2 Detail Approval

```http
GET /api/overtime/approvals/:id
```

### 12.3 Approve Request

```http
PUT /api/overtime/approvals/:id/approve
```

Body:

```json
{
  "note": "Lembur disetujui karena pekerjaan urgent dan sudah sesuai kebutuhan department"
}
```

Expected:

```json
{
  "success": true,
  "message": "Overtime request approved successfully",
  "data": {
    "approval_id": 1,
    "request_id": 1,
    "approval_status": "APPROVED",
    "request_status": "APPROVED"
  }
}
```

### 12.4 Reject Request

```http
PUT /api/overtime/approvals/:id/reject
```

Body:

```json
{
  "note": "Lembur ditolak karena jadwal belum sesuai"
}
```

Expected:

```json
{
  "success": true,
  "message": "Overtime request rejected successfully",
  "data": {
    "approval_id": 1,
    "request_id": 1,
    "approval_status": "REJECTED",
    "request_status": "REJECTED"
  }
}
```

---

## 13. Overtime Reports

Endpoint report hanya untuk user dengan permission:

```txt
REPORT_MANAGE + GLOBAL
```

Report manager bisa:

- Melihat semua request overtime.
- Filter data request overtime.
- Update status input Talenta.
- Bulk update status input Talenta.

### 13.1 List Reports

```http
GET /api/overtime/reports
```

Query optional:

| Query | Type | Keterangan |
|---|---:|---|
| `search` | string | Search request number / employee name / description |
| `status` | string | `SUBMITTED` / `APPROVED` / `REJECTED` / `CANCELED` |
| `talenta_status` | string | `PENDING` / `PROCESSED` |
| `employment_type_code` | string | `UP` / `OS` / `HL` |
| `department_id` | number | Filter department employee |
| `company_id` | string | Filter company employee |
| `day_type` | string | `WORKDAY` / `HOLIDAY` / `WEEKEND` / `NATIONAL_HOLIDAY` |
| `compensation_type_id` | number | Filter compensation |
| `employee_id` | string | Filter employee |
| `submitted_by` | string | Filter submitter |
| `approver_id` | string | Filter approver |
| `source_type` | string | `SELF` / `SCOPED_INPUT` / `ALL_INPUT` |
| `request_date_from` | date | `YYYY-MM-DD` |
| `request_date_to` | date | `YYYY-MM-DD` |
| `work_date_from` | date | `YYYY-MM-DD` |
| `work_date_to` | date | `YYYY-MM-DD` |
| `page` | number | Default 1 |
| `limit` | number | Default 10 |

Contoh:

```http
GET /api/overtime/reports?status=APPROVED&talenta_status=PENDING&department_id=8&work_date_from=2026-06-01&work_date_to=2026-06-30
```

### 13.2 Detail Report

```http
GET /api/overtime/reports/:id
```

### 13.3 Update Talenta Status Satuan

```http
PUT /api/overtime/reports/:id/talenta-status
```

Body processed:

```json
{
  "talenta_status": "PROCESSED",
  "note": "Sudah diinput manual ke Talenta"
}
```

Body pending:

```json
{
  "talenta_status": "PENDING",
  "note": "Status Talenta dikembalikan ke pending karena perlu koreksi"
}
```

Expected:

```json
{
  "success": true,
  "message": "Talenta status updated successfully",
  "data": {
    "id": 1,
    "status": "APPROVED",
    "talenta_status": "PROCESSED",
    "talenta_processed_by": "USER_ID_REPORT_MANAGER",
    "talenta_processed_at": "2026-06-24T10:00:00.000Z"
  }
}
```

Catatan:

- Hanya request dengan status `APPROVED` yang bisa diproses ke Talenta.
- Jika request belum `APPROVED`, backend akan return validation error.

### 13.4 Bulk Update Talenta Status

```http
PUT /api/overtime/reports/talenta-status/bulk
```

Body:

```json
{
  "ids": [1, 2, 3],
  "talenta_status": "PROCESSED",
  "note": "Bulk input ke Talenta periode Juni 2026"
}
```

Expected jika semua ID valid dan status request `APPROVED`:

```json
{
  "success": true,
  "message": "Talenta status bulk updated successfully",
  "data": {
    "updated_ids": [1, 2, 3],
    "talenta_status": "PROCESSED",
    "total_updated": 3
  }
}
```

Expected jika ada request yang belum `APPROVED`:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "status": "Only APPROVED requests can be processed to Talenta. Invalid request numbers: OVT-SIT-26-00002"
  }
}
```

---

## 14. Recommended FE Page Mapping

| FE Page | Endpoint utama |
|---|---|
| Login / Auth Callback | Dari PilarGroup central auth |
| Current User Bootstrap | `GET /api/auth/me` |
| Form Lembur | `GET /api/overtime/requests/eligible-employees` |
| Form Lembur - Compensation Dropdown | `GET /api/master/compensation-types?is_active=1&limit=100` |
| Submit Single Lembur | `POST /api/overtime/requests` |
| Submit Bulk Lembur | `POST /api/overtime/requests/bulk` |
| My Requests | `GET /api/overtime/requests` |
| Request Detail | `GET /api/overtime/requests/:id` |
| Cancel Request | `PUT /api/overtime/requests/:id/cancel` |
| Approval Inbox | `GET /api/overtime/approvals?status=PENDING&request_status=SUBMITTED` |
| Approval Detail | `GET /api/overtime/approvals/:id` |
| Approve | `PUT /api/overtime/approvals/:id/approve` |
| Reject | `PUT /api/overtime/approvals/:id/reject` |
| Report List | `GET /api/overtime/reports` |
| Report Detail | `GET /api/overtime/reports/:id` |
| Update Talenta Status | `PUT /api/overtime/reports/:id/talenta-status` |
| Bulk Update Talenta Status | `PUT /api/overtime/reports/talenta-status/bulk` |
| Master Compensation | `/api/master/compensation-types` |
| Master User Permission | `/api/master/user-permissions` |
| Master Approval Rule | `/api/master/approval-rules` |

---

## 15. FE Validation Notes

FE tetap boleh validasi ringan, tapi backend tetap menjadi source of truth.

Recommended FE validation:

| Field | FE validation |
|---|---|
| `employee_id` | Optional untuk self, required jika input orang lain / bulk pakai `employee_ids` |
| `employee_ids` | Required array untuk bulk |
| `day_type` | Required enum |
| `work_date` | Required date |
| `start_time` | Required time |
| `end_time` | Required time |
| `task_description` | Required |
| `result_description` | Required |
| `compensation_type_id` | Required number |
| `talenta_status` | Required `PENDING` / `PROCESSED` ketika update report |

Cross-day rule:

- FE boleh menampilkan info bahwa jam selesai lebih kecil dari jam mulai akan dihitung sampai hari berikutnya.
- Backend sudah handle otomatis jika `end_date` tidak dikirim.

Backdate rule:

- Backend mengizinkan submit untuk tanggal lembur maksimal 2 bulan ke belakang.

---

## 16. Common Error Cases

### Tidak punya akses input employee

```json
{
  "success": false,
  "message": "You are not allowed to submit overtime request for this employee"
}
```

Pada bulk, error ini muncul di `failed_items`.

### Approval rule tidak ditemukan

```json
{
  "success": false,
  "message": "Approval rule not found for this employee"
}
```

Biasanya karena master approval rule belum sesuai job level / department employee.

### Approver tidak ditemukan

```json
{
  "success": false,
  "message": "Approver Manager not found for this employee department"
}
```

Biasanya karena data central user approver belum ada, tidak active, atau job level name tidak match.

### Talenta status hanya untuk approved request

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "status": "Only APPROVED request can be processed to Talenta"
  }
}
```

---

## 17. Quick Testing Order for FE

1. Aktifkan tunnel.
2. Jalankan backend local.
3. Test `GET /api/auth/me`.
4. Test `GET /api/master/compensation-types?is_active=1&limit=100`.
5. Test `GET /api/overtime/requests/eligible-employees`.
6. Submit single request `POST /api/overtime/requests`.
7. Submit bulk request `POST /api/overtime/requests/bulk`.
8. Login sebagai approver, test approval inbox.
9. Approve request.
10. Login user dengan `REPORT_MANAGE`, test report list.
11. Update `talenta_status` satuan.
12. Test bulk update `talenta_status`.

---

## 18. Naming Reminder

Gunakan nama `Talenta`, bukan `Mekari`, untuk seluruh FE label, variable, form field, dan endpoint.

Benar:

```txt
talenta_status
talenta_processed_by
talenta_processed_at
/api/overtime/reports/:id/talenta-status
/api/overtime/reports/talenta-status/bulk
```

Hindari:

```txt
mekari_status
mekari_processed_by
mekari_processed_at
/api/overtime/reports/:id/mekari-status
```
