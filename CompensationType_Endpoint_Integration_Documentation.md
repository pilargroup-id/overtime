# Compensation Type Endpoint Integration

Dokumen ini menjelaskan cara menggunakan endpoint create dan update compensation type sesuai `Overtime_FE_Consumed_Documentation.md` bagian 8.2 dan 8.4.

## Endpoint

Base URL frontend diambil dari `VITE_API_BASE_URL`. Jika env tidak diisi, service memakai default:

```txt
http://localhost:3000/api
```

Resource compensation type sudah tersedia di:

```js
api.compensationTypes
```

Resource ini mengarah ke endpoint:

```http
/master/compensation-types
```

## Payload

Field yang dikirim untuk create dan update sama:

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

Aturan payload:

- `code`: wajib, string unik untuk compensation type.
- `name`: wajib, nama yang ditampilkan di UI.
- `compensation_kind`: wajib, hanya `MONEY` atau `LEAVE`.
- `amount`: wajib angka lebih dari 0 jika `compensation_kind` adalah `MONEY`, dan harus `null` jika `LEAVE`.
- `leave_days`: wajib angka lebih dari 0 jika `compensation_kind` adalah `LEAVE`, dan harus `null` jika `MONEY`.
- `description`: optional, boleh `null`.
- `is_active`: `1` untuk active, `0` untuk inactive.

## Cara Create Dengan POST

Endpoint:

```http
POST /api/master/compensation-types
```

Contoh pemakaian di React:

```js
import api from '../services/api.js'

const payload = {
  code: 'MONEY_100K',
  name: 'Uang Lembur 100.000',
  compensation_kind: 'MONEY',
  amount: 100000,
  leave_days: null,
  description: 'Kompensasi uang lembur sebesar 100.000',
  is_active: 1,
}

const createdCompensationType = await api.compensationTypes.create(payload)
```

Pada project ini implementasinya ada di:

```txt
frontend/src/components/Dialog/dialog-compensation/DialogCreateCompensation.jsx
```

Alur create:

- User mengisi form create compensation type.
- Form membentuk payload sesuai aturan `MONEY` atau `LEAVE`.
- Form memanggil `api.compensationTypes.create(payload)`.
- Service API mengirim request `POST` ke `/master/compensation-types`.
- Jika sukses, callback `onCreated` dipanggil dan table direfresh.

## Cara Update Dengan PUT

Endpoint:

```http
PUT /api/master/compensation-types/:id
```

Contoh pemakaian di React:

```js
import api from '../services/api.js'

const compensationTypeId = 1
const payload = {
  code: 'LEAVE_HALF_DAY',
  name: 'Cuti Pengganti 1/2 Hari',
  compensation_kind: 'LEAVE',
  amount: null,
  leave_days: 0.5,
  description: 'Kompensasi cuti pengganti setengah hari',
  is_active: 1,
}

const updatedCompensationType = await api.compensationTypes.update(
  compensationTypeId,
  payload,
)
```

Pada project ini implementasinya ada di:

```txt
frontend/src/components/Dialog/dialog-compensation/DialogEditCompensation.jsx
```

Alur update:

- User klik tombol edit di row compensation type.
- Table mengirim data row ke `DialogEditCompensation`.
- Dialog mengisi form dari data row yang dipilih.
- Saat submit, dialog mengambil `id` dari row.
- Dialog memanggil `api.compensationTypes.update(id, payload)`.
- Service API mengirim request `PUT` ke `/master/compensation-types/:id`.
- Jika sukses, callback `onEdited` dipanggil dan table direfresh.

## Cara Menghubungkan Ke Endpoint

Pastikan env frontend mengarah ke backend yang benar:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

Service endpoint sudah didefinisikan di:

```txt
frontend/src/services/api.js
```

Bagian yang dipakai:

```js
compensationTypes: createResource('/master/compensation-types')
```

Dengan konfigurasi tersebut, method resource otomatis menjadi:

```js
api.compensationTypes.list(params)
api.compensationTypes.detail(id)
api.compensationTypes.create(payload)
api.compensationTypes.update(id, payload)
api.compensationTypes.remove(id)
```

Dialog create dan edit cukup import service berikut:

```js
import api from '../../../services/api.js'
```

Lalu panggil:

```js
await api.compensationTypes.create(payload)
await api.compensationTypes.update(compensationTypeId, payload)
```
