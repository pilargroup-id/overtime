# Dokumentasi ID & Name - DataTableUserPermission

File terkait:

- `frontend/src/components/table/dekstop/DataTableUserPermission.jsx`
- Endpoint FE: `api.userPermissions.list(...)`
- Endpoint backend: `GET /api/master/user-permissions`
- Model backend: `backend/src/models/master/user-permission.model.js`

---

## 1. Kondisi Saat Ini

Di `DataTableUserPermission.jsx`, beberapa kolom masih mengambil dan menampilkan nilai ID langsung dari response API.

```jsx
title={formatValue(request.user_id)}
subtitle={formatValue(request.department_id)}
```

```jsx
render: (request) => formatValue(request.company_id)
```

```jsx
render: (request) => formatDate(request.granted_by)
```

Catatan penting:

- `user_id` adalah ID user, bukan nama user.
- `department_id` adalah ID department, bukan nama department.
- `company_id` adalah ID company, bukan nama company.
- `granted_by` adalah ID user pemberi permission, bukan tanggal. Jadi jangan memakai `formatDate(request.granted_by)` kecuali backend memang mengubah field tersebut menjadi tanggal.

---

## 2. Field yang Saat Ini Dikirim Backend

Endpoint `GET /api/master/user-permissions` saat ini mengambil data dari tabel `user_permissions`.

Response item yang tersedia:

```json
{
  "id": 1,
  "user_id": "USER_ID",
  "permission_type": "REQUEST_CREATE_SCOPED",
  "scope_type": "DEPARTMENT",
  "company_id": "comp-pnm-0001",
  "department_id": 8,
  "granted_by": "GRANTED_BY_USER_ID",
  "is_active": 1,
  "valid_from": null,
  "valid_until": null,
  "created_at": "2026-06-29T00:00:00.000Z",
  "updated_at": "2026-06-29T00:00:00.000Z"
}
```

Karena backend belum mengirim field nama, FE hanya bisa menampilkan ID.

---

## 3. Mapping ID ke Name yang Dibutuhkan FE

| Kolom UI | Field ID sekarang | Field name yang dibutuhkan | Fallback jika name belum ada |
|---|---|---|---|
| Username | `user_id` | `user_name` / `username` | `user_id` |
| Subtitle user | `department_id` | `department_name` / `department_code` | `department_id` |
| Company | `company_id` | `company_name` / `company_code` | `company_id` |
| Permission Type | `permission_type` | Tidak perlu mapping, enum sudah cukup | `permission_type` |
| Scope Type | `scope_type` | Tidak perlu mapping, enum sudah cukup | `scope_type` |
| Granted By | `granted_by` | `granted_by_name` / `granted_by_username` | `granted_by` |

---

## 4. Response API yang Disarankan

Supaya table bisa menampilkan nama tetapi tetap menyimpan ID untuk submit/update, backend sebaiknya tetap mengirim field ID dan menambahkan field display name.

Contoh response item yang ideal:

```json
{
  "id": 1,
  "user_id": "USER_ID",
  "user_name": "Andi Saputra",
  "username": "andi",
  "company_id": "comp-pnm-0001",
  "company_name": "PT Pilar Niaga Makmur",
  "company_code": "PNM",
  "department_id": 8,
  "department_name": "IT",
  "department_code": "SIT",
  "permission_type": "REQUEST_CREATE_SCOPED",
  "scope_type": "DEPARTMENT",
  "granted_by": "GRANTED_BY_USER_ID",
  "granted_by_name": "Budi Santoso",
  "granted_by_username": "budi",
  "is_active": 1,
  "valid_from": null,
  "valid_until": null,
  "created_at": "2026-06-29T00:00:00.000Z",
  "updated_at": "2026-06-29T00:00:00.000Z"
}
```

Dengan bentuk ini:

- FE tetap punya `user_id`, `company_id`, `department_id`, dan `granted_by` untuk kebutuhan update/filter.
- FE bisa menampilkan `user_name`, `company_name`, `department_name`, dan `granted_by_name` untuk kebutuhan UI.
- Jika field name belum tersedia, FE tetap bisa fallback ke ID.

---

## 5. Saran Render di DataTableUserPermission

Gunakan fallback berurutan dari name ke ID.

```jsx
{
  key: 'user_id',
  header: 'Username',
  render: (request) => (
    <DataTableIdentity
      title={formatValue(request.user_name ?? request.username ?? request.user_id)}
      subtitle={formatValue(request.department_name ?? request.department_code ?? request.department_id)}
    />
  ),
}
```

```jsx
{
  key: 'company',
  header: 'Company',
  render: (request) =>
    formatValue(request.company_name ?? request.company_code ?? request.company_id),
}
```

```jsx
{
  key: 'grantedBy',
  header: 'Granted By',
  render: (request) =>
    formatValue(request.granted_by_name ?? request.granted_by_username ?? request.granted_by),
}
```

Jangan pakai `formatDate(request.granted_by)` karena `granted_by` adalah ID user. Jika butuh tanggal pemberian permission, pakai field lain seperti `created_at` atau tambahkan field khusus seperti `granted_at`.

---

## 6. Catatan Backend

Backend saat ini mengambil data dari query:

```sql
SELECT
  id,
  user_id,
  permission_type,
  scope_type,
  company_id,
  department_id,
  granted_by,
  is_active,
  valid_from,
  valid_until,
  created_at,
  updated_at
FROM user_permissions
```

Jika ingin FE langsung mendapatkan name, backend perlu melakukan join atau enrichment data dari sumber user/company/department.

Minimal field tambahan yang dibutuhkan:

```txt
user_name
username
company_name
company_code
department_name
department_code
granted_by_name
granted_by_username
```

Field ID tetap jangan dihapus karena masih dibutuhkan untuk create, update, filter, dan relasi data.
