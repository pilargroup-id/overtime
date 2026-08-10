# Overtime FE Guide - Dynamic Intermediate Approval

## 1. Summary

Approval Overtime sekarang mendukung **optional intermediate approver** yang dikontrol dari `approval_rules`.

Tujuan perubahan:

- Staff tetap langsung ke Manager.
- Manager dapat melalui Senior Manager terlebih dahulu jika rule mengaktifkan intermediate dan Senior Manager yang sesuai memang tersedia.
- Jika Manager tidak memiliki Senior Manager yang sesuai, request langsung ke final approver dari rule.
- Senior Manager tidak melewati intermediate level yang sama; final approver tetap ditentukan oleh rule, untuk konfigurasi saat ini menuju President Director.
- Tidak ada perubahan payload create overtime dari FE.

---

## 2. Field baru pada Approval Rule

Response endpoint approval rule sekarang memiliki dua field tambahan:

```json
{
  "use_intermediate_approver": 1,
  "intermediate_job_level_value": 5
}
```

### `use_intermediate_approver`

| Value | Meaning |
|---|---|
| `0` | Intermediate approval OFF. Request langsung ke final approver. |
| `1` | Intermediate approval ON. Backend mencoba mencari intermediate approver. |

### `intermediate_job_level_value`

Job level value yang harus dicari sebagai intermediate approver.

Contoh:

```json
{
  "use_intermediate_approver": 1,
  "intermediate_job_level_value": 5
}
```

Artinya backend mencari user aktif dengan `job_level_value = 5` yang memiliki department yang sama dengan requester.

> FE jangan hardcode label `Senior Manager`. Label dapat ditampilkan dari data directory/job level. Logic backend menggunakan `job_level_value` yang dikonfigurasi pada rule.

---

## 3. Endpoint Approval Rules

Endpoint tidak berubah:

```text
GET  /api/master/approval-rules
GET  /api/master/approval-rules/:id
POST /api/master/approval-rules
PUT  /api/master/approval-rules/:id
```

### Contoh update: intermediate ON

```http
PUT /api/master/approval-rules/5
Content-Type: application/json
```

```json
{
  "use_intermediate_approver": 1,
  "intermediate_job_level_value": 5
}
```

### Contoh update: intermediate OFF

```json
{
  "use_intermediate_approver": 0
}
```

Saat OFF, backend akan menyimpan:

```json
{
  "use_intermediate_approver": 0,
  "intermediate_job_level_value": null
}
```

### Rekomendasi UI Approval Rule

Gunakan:

- Toggle: **Use Intermediate Approver**
- Number/select field: **Intermediate Job Level**

Behavior UI:

```text
Toggle OFF
→ disable/hide Intermediate Job Level

Toggle ON
→ Intermediate Job Level wajib diisi
```

---

## 4. Flow aktual

### A. Staff

Rule:

```text
STAFF_TO_MANAGER
use_intermediate_approver = 0
```

Flow:

```text
Staff
  ↓
Manager
  ↓ APPROVE
Request = APPROVED
```

Walaupun di department Staff ada Supervisor, Supervisor **tidak otomatis menjadi approver** karena intermediate OFF pada rule.

---

### B. Manager memiliki Senior Manager

Contoh konfigurasi:

```text
use_intermediate_approver = 1
intermediate_job_level_value = 5
```

Backend mencari user aktif level 5 yang share department dengan Manager.

Flow:

```text
Manager submit
  ↓
Senior Manager (approval_level = 1)
  ↓ APPROVE
Final Director (approval_level = 2)
  ↓ APPROVE
Request = APPROVED
```

Ketika Senior Manager approve:

- approval Senior Manager menjadi `APPROVED`;
- `requests.status` **masih `SUBMITTED`**;
- backend membuat approval level berikutnya;
- `requests.current_approver_id` berubah ke final approver.

FE **jangan menganggap HTTP approve sukses berarti request pasti sudah `APPROVED`**.

Setelah approve, refresh approval/request data.

---

### C. Manager tidak memiliki Senior Manager

Jika intermediate ON tetapi backend tidak menemukan user level target yang share department:

```text
Manager submit
  ↓
Final Director (approval_level = 1)
  ↓ APPROVE
Request = APPROVED
```

Tidak dianggap error. Backend otomatis fallback ke final approver rule.

---

### D. Senior Manager

Dengan konfigurasi saat ini, requester level 5 tidak mencari intermediate level 5 lagi.

Flow:

```text
Senior Manager submit
  ↓
President Director
  ↓ APPROVE
Request = APPROVED
```

---

## 5. Final approver matching

Field existing di approval rule tetap bernama:

```text
approver_job_level_name
```

Data existing memiliki dua bentuk target, misalnya:

```text
Manager
Finance Director
President Director
```

Backend sekarang kompatibel terhadap data existing dengan melakukan exact match terhadap:

1. `job_level`, atau
2. `job_position`.

Contoh:

```text
approver_job_level_name = Manager
→ match job_level = Manager
```

```text
approver_job_level_name = Finance Director
→ dapat match job_position = Finance Director
```

Tidak ada perubahan nama field API pada update ini agar FE existing tidak rusak.

---

## 6. Endpoint approval tetap sama

Single approve:

```text
PUT /api/overtime/approvals/:id/approve
```

Single reject:

```text
PUT /api/overtime/approvals/:id/reject
```

Bulk approve:

```text
PUT /api/overtime/approvals/bulk/approve
```

Bulk reject:

```text
PUT /api/overtime/approvals/bulk/reject
```

Payload contoh:

```json
{
  "note": "Approved"
}
```

Bulk:

```json
{
  "ids": [11, 12],
  "note": "Bulk approved"
}
```

---

## 7. Perubahan penting untuk halaman Approval FE

Backend sekarang memastikan approval hanya dapat diproses jika:

```text
approval.approver_id == logged-in user
AND
approval.status == PENDING
AND
request.status == SUBMITTED
AND
request.current_approver_id == logged-in user
```

Jadi FE sebaiknya hanya menampilkan tombol Approve/Reject pada row yang benar-benar merupakan current approval step.

Jika FE menyimpan list lama dan step sudah berpindah, backend dapat membalas validation error. Refresh list setelah approve/reject.

---

## 8. Bulk approve

Bulk approve tetap dapat dipakai.

Namun hasil proses dapat berbeda per approval:

```text
Final approval
→ request menjadi APPROVED

Intermediate approval
→ request tetap SUBMITTED
→ next approval dibuat
→ current_approver_id berpindah
```

Karena itu setelah bulk approve:

1. tampilkan success dari response;
2. refetch approval list;
3. refetch request/report bila layar memerlukan status request terbaru.

Jangan memaksa status request menjadi `APPROVED` di client hanya karena bulk endpoint sukses.

---

## 9. Reject

Reject pada current approval step tetap bersifat final:

```text
Intermediate Reject
→ request = REJECTED

Final Approver Reject
→ request = REJECTED
```

Tidak ada next approval setelah reject.

---

## 10. Request fields yang perlu diperhatikan

Tidak ada field baru pada payload create overtime.

Untuk membaca progress approval, field existing berikut tetap penting:

```text
status
approval_type
current_approver_id
```

Interpretasi:

```text
status = SUBMITTED
current_approver_id = Senior Manager
→ menunggu intermediate approval
```

Setelah intermediate approve:

```text
status = SUBMITTED
current_approver_id = Director
→ menunggu final approval
```

Setelah final approve:

```text
status = APPROVED
current_approver_id = null
```

---

## 11. Request approval history

`request_approvals.approval_level` sekarang benar-benar dapat memiliki lebih dari satu level:

```text
approval_level = 1 → intermediate approver
approval_level = 2 → final approver
```

Jika intermediate tidak ditemukan/off:

```text
approval_level = 1 → final approver
```

Jangan mengasumsikan level 1 selalu Manager atau selalu final approver.

---

## 12. Configuration shipped with this update

Migration mengatur:

```text
STAFF_TO_MANAGER
→ intermediate OFF
```

Managerial rules:

```text
use_intermediate_approver = 1
intermediate_job_level_value = 5
```

Rule department-specific menuju Finance Director dibatasi ke requester level 4, sehingga requester Senior Manager level 5 menggunakan generic President Director rule.

Ini menghasilkan flow:

```text
Manager dept dengan Finance Director mapping
→ Senior Manager jika tersedia
→ Finance Director
```

```text
Manager department lain
→ Senior Manager jika tersedia
→ President Director
```

```text
Senior Manager
→ President Director
```

---

## 13. FE implementation checklist

- [ ] Tambahkan `use_intermediate_approver` pada form Approval Rule.
- [ ] Tambahkan `intermediate_job_level_value` pada form Approval Rule.
- [ ] Disable/hide intermediate level saat toggle OFF.
- [ ] Jangan hardcode Senior Manager berdasarkan label.
- [ ] Setelah single approve, refetch approval/request.
- [ ] Setelah bulk approve, refetch approval/request.
- [ ] Jangan menganggap approve sukses selalu berarti request final `APPROVED`.
- [ ] Gunakan `current_approver_id` sebagai indikator current step.
- [ ] Approval history harus mendukung `approval_level > 1`.
- [ ] Reject tetap dianggap final request rejection.

## 14. Ambiguous intermediate approver

Backend tidak memilih intermediate approver secara acak.

Urutan pemilihan:

1. cari user aktif dengan `intermediate_job_level_value` yang share department dengan requester;
2. jika tepat satu kandidat berada di primary department requester, kandidat tersebut dipakai;
3. jika tidak ada kandidat, fallback langsung ke final approver;
4. jika terdapat lebih dari satu kandidat yang sama-sama valid dan tidak dapat ditentukan secara unik, backend mengembalikan validation error `400`.

FE cukup menampilkan pesan validation dari backend. Kondisi ini menandakan data organisasi/directory perlu dirapikan, bukan user diminta memilih approver manual.
