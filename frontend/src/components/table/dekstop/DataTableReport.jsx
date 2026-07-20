import { useEffect, useMemo, useState } from 'react'

import api from '../../../services/api.js'
import DataTable, {
  DataTableIdentity,
  DataTableStatus,
} from '../DataTable.jsx'

const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500]
const TALENTA_STATUS_PENDING = 'PENDING'
const TALENTA_STATUS_PROCESSED = 'PROCESSED'

function normalizeResponseRows(responseData) {
  if (Array.isArray(responseData)) {
    return responseData
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data
  }

  if (Array.isArray(responseData?.rows)) {
    return responseData.rows
  }

  if (Array.isArray(responseData?.results)) {
    return responseData.results
  }

  return []
}

function normalizeResponseMeta(responseData, fallbackRowsLength, pageSize) {
  const meta = responseData?.meta ?? {}

  return {
    total: Number(meta.total ?? fallbackRowsLength),
    totalPages: Math.max(1, Number(meta.totalPages ?? Math.ceil(fallbackRowsLength / pageSize))),
  }
}

function formatValue(value) {
  const displayValue = String(value ?? '').trim()

  return displayValue || '-'
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return formatValue(value)
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatTime(value) {
  return String(value ?? '').slice(0, 5) || '-'
}

function formatDuration(totalMinutes) {
  const minutes = Number(totalMinutes)

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '-'
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours && remainingMinutes) {
    return `${hours}j ${remainingMinutes}m`
  }

  if (hours) {
    return `${hours}j`
  }

  return `${remainingMinutes}m`
}

function getNestedValue(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source)
}

function formatCompensation(request, compensationTypeMap) {
  const compensationNameFields = [
    'compensation_type_name',
    'compensation_name',
    'compensationType.name',
    'compensationType.code',
    'compensation_type.name',
    'compensation_type.code',
  ]

  for (const field of compensationNameFields) {
    const value = getNestedValue(request, field)

    if (String(value ?? '').trim()) {
      return formatValue(value)
    }
  }

  const mappedName = compensationTypeMap.get(String(request.compensation_type_id))

  return mappedName ? formatValue(mappedName) : formatValue(request.compensation_type_id)
}

function getStatusVariant(status) {
  const normalizedStatus = String(status ?? '').toUpperCase()

  if (normalizedStatus === 'APPROVED') {
    return 'active'
  }

  if (normalizedStatus === 'SUBMITTED') {
    return 'pending'
  }

  if (normalizedStatus === 'REJECTED' || normalizedStatus === 'CANCELED') {
    return 'inactive'
  }

  return 'app'
}

function normalizeTalentaStatus(status) {
  const normalizedStatus = String(status ?? '').toUpperCase()

  return normalizedStatus === TALENTA_STATUS_PROCESSED
    ? TALENTA_STATUS_PROCESSED
    : TALENTA_STATUS_PENDING
}

function getPaginationSummary(firstItem, lastItem, totalItems) {
  if (totalItems === 0) {
    return '0 dari 0 request'
  }

  return `${firstItem}-${lastItem} dari ${totalItems} request`
}

function createColumns(compensationTypeMap) {
  return [
  {
    key: 'request',
    header: 'Request',
    headerStyle: { width: '23%' },
    cellStyle: { width: '23%' },
    render: (request) => (
      <DataTableIdentity
        title={formatValue(request.employee_name_snapshot)}
        subtitle={formatValue(request.request_number)}
      />
    ),
  },
 {
    key: 'department',
    header: 'Department & Company',
    headerStyle: { width: '15%' },
    cellStyle: { width: '15%' },
    render: (request) => (
      <DataTableIdentity
        title={formatValue(request.department_name_snapshot)}
        subtitle={formatValue(request.company_name_snapshot)}
      />
    ),
  },
  {
    key: 'dayType',
    header: 'Day Type',
    headerStyle: { width: '10%'},
    render : (request) => formatValue(request.day_type)
  },
  {
    key: 'workDate',
    header: 'Work Date',
    headerStyle: { width: '12%' },
    cellStyle: { width: '12%' },
    render: (request) => formatDate(request.work_date),
  },
  {
    key: 'time',
    header: 'Time',
    headerStyle: { width: '12%' },
    cellStyle: { width: '12%' },
    render: (request) => `${formatTime(request.start_time)} - ${formatTime(request.end_time)}`,
  },
  {
    key: 'duration',
    header: 'Duration',
    headerStyle: { width: '9%' },
    cellStyle: { width: '9%' },
    render: (request) => formatDuration(request.total_minutes),
  },
  {
    key: 'compensation',
    header: 'Compensation',
    headerStyle: { width: '10%'},
    render : (request) => formatCompensation(request, compensationTypeMap)
  },
  {
    key: 'status',
    header: 'Status',
    headerStyle: { width: '22%' },
    cellStyle: { width: '22%' },
    render: (request) => (
      <DataTableStatus inline variant={getStatusVariant(request.status)}>
        {formatValue(request.status)}
      </DataTableStatus>
    ),
  },
]
}

function TalentaStatusToggle({ status, disabled = false, onChange }) {
  const normalizedStatus = normalizeTalentaStatus(status)
  const isProcessed = normalizedStatus === TALENTA_STATUS_PROCESSED
  const nextStatus = isProcessed ? TALENTA_STATUS_PENDING : TALENTA_STATUS_PROCESSED

  return (
    <button
      type="button"
      className={[
        'talenta-status-toggle',
        isProcessed ? 'talenta-status-toggle--active' : '',
      ].filter(Boolean).join(' ')}
      role="switch"
      aria-checked={isProcessed}
      disabled={disabled}
      title={`Ubah ke ${nextStatus}`}
      onClick={onChange}
    >
      <span className="talenta-status-toggle__track" aria-hidden="true">
        <span className="talenta-status-toggle__thumb" />
      </span>
      <span className="talenta-status-toggle__label">{normalizedStatus}</span>
    </button>
  )
}

function DataTableReport({
  searchQuery = '',
  statusFilter = '',
  tableLabel = 'Request Overtime table',
  refreshKey = 0,
}) {
  const [requestRows, setRequestRows] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [updatingTalentaRequestId, setUpdatingTalentaRequestId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [compensationTypeMap, setCompensationTypeMap] = useState(() => new Map())

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  useEffect(() => {
    let isMounted = true

    const loadCompensationTypes = async () => {
      try {
        const response = await api.compensationTypes.list({ limit: 500 })
        const rows = normalizeResponseRows(response)
        const nextMap = new Map()

        rows.forEach((compensationType) => {
          if (compensationType?.id === undefined || compensationType?.id === null) {
            return
          }

          nextMap.set(
            String(compensationType.id),
            compensationType.name ?? compensationType.code ?? compensationType.id,
          )
        })

        if (isMounted) {
          setCompensationTypeMap(nextMap)
        }
      } catch {
        if (isMounted) {
          setCompensationTypeMap(new Map())
        }
      }
    }

    loadCompensationTypes()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadRequests = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.overtimeReports.list({
          page: currentPage,
          limit: pageSize,
          search: searchQuery,
          status: statusFilter,
        })

        if (!isMounted) {
          return
        }

        const rows = normalizeResponseRows(response)
        const meta = normalizeResponseMeta(response, rows.length, pageSize)

        setRequestRows(rows)
        setTotalItems(meta.total)
        setTotalPages(meta.totalPages)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setRequestRows([])
        setTotalItems(0)
        setTotalPages(1)
        setErrorMessage(error?.message || 'Gagal memuat data request overtime.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadRequests()

    return () => {
      isMounted = false
    }
  }, [currentPage, pageSize, refreshKey, reloadKey, searchQuery, statusFilter])

  const handleToggleTalentaStatus = async (request) => {
    const requestId = request?.id

    if (!requestId) {
      setErrorMessage('Request overtime tidak memiliki ID untuk update Talenta Status.')
      return
    }

    const previousStatus = normalizeTalentaStatus(request.talenta_status)
    const nextStatus =
      previousStatus === TALENTA_STATUS_PROCESSED
        ? TALENTA_STATUS_PENDING
        : TALENTA_STATUS_PROCESSED

    setUpdatingTalentaRequestId(requestId)
    setErrorMessage('')
    setRequestRows((rows) =>
      rows.map((row) =>
        String(row.id) === String(requestId) ? { ...row, talenta_status: nextStatus } : row,
      ),
    )

    try {
      const response = await api.overtimeReports.updateTalentaStatus(requestId, {
        talenta_status: nextStatus,
      })
      const responseRow = response?.data && !Array.isArray(response.data) ? response.data : response

      setRequestRows((rows) =>
        rows.map((row) =>
          String(row.id) === String(requestId)
            ? { ...row, ...responseRow, talenta_status: nextStatus }
            : row,
        ),
      )
      setReloadKey((key) => key + 1)
    } catch (error) {
      setRequestRows((rows) =>
        rows.map((row) =>
          String(row.id) === String(requestId)
            ? { ...row, talenta_status: previousStatus }
            : row,
        ),
      )
      setErrorMessage(error?.message || 'Gagal update Talenta Status.')
    } finally {
      setUpdatingTalentaRequestId(null)
    }
  }

  const safeCurrentPage = Math.min(currentPage, totalPages)
  const firstItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const lastItem = totalItems === 0 ? 0 : Math.min(firstItem + requestRows.length - 1, totalItems)

  const pagination = useMemo(
    () => ({
      summary: getPaginationSummary(firstItem, lastItem, totalItems),
      currentPage: safeCurrentPage,
      totalPages,
      pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      pageSizeLabel: 'Tampilkan',
      pageSizeSuffix: 'baris',
      previousLabel: 'Sebelumnya',
      nextLabel: 'Berikutnya',
      ariaLabel: 'Request overtime pagination',
      pageSizeAriaLabel: 'Jumlah request overtime per halaman',
      onPrevious: () => setCurrentPage((page) => Math.max(1, page - 1)),
      onNext: () => setCurrentPage((page) => Math.min(totalPages, page + 1)),
      onSelect: setCurrentPage,
      onPageSizeChange: (nextPageSize) => {
        setPageSize(nextPageSize)
        setCurrentPage(1)
      },
    }),
    [firstItem, lastItem, pageSize, safeCurrentPage, totalItems, totalPages],
  )

  const emptyMessage = isLoading
    ? 'Memuat data request overtime...'
    : errorMessage || 'Belum ada request overtime untuk ditampilkan.'

  const columns = useMemo(
    () => createColumns(compensationTypeMap),
    [compensationTypeMap],
  )

  return (
    <>
      <div className="mtickets-table-shell req-overtime-table-shell report-overtime-table-shell">
        <DataTable
          className="mtickets-table"
          rows={requestRows}
          columns={columns}
          getRowId={(request, index) => request.id ?? request.request_number ?? index}
          tableLabel={tableLabel}
          emptyMessage={emptyMessage}
          pagination={pagination}
          detail={{
            columnLabel: 'Talenta Status',
            headerStyle: { width: '22%' },
            cellStyle: { width: '22%' },
            eyebrow: 'Request Overtime',
            title: (request) => formatValue(request.request_number),
            description: (request) => formatValue(request.task_description),
            renderCell: (request) => (
              <TalentaStatusToggle
                status={request.talenta_status}
                disabled={String(updatingTalentaRequestId) === String(request.id)}
                onChange={(event) => {
                  event.stopPropagation()
                  handleToggleTalentaStatus(request)
                }}
              />
            ),
            sections: (request) => [
              {
                title: 'Employee',
                fields: [
                  { label: 'Name', value: formatValue(request.employee_name_snapshot) },
                  { label: 'Employee ID', value: formatValue(request.employee_internal_id_snapshot) },
                  { label: 'Department', value: formatValue(request.department_name_snapshot) },
                  { label: 'Company', value: formatValue(request.company_name_snapshot) },
                ],
              },
              {
                title: 'Overtime',
                fields: [
                  { label: 'Day Type', value: formatValue(request.day_type) },
                  { label: 'Work Date', value: formatDate(request.work_date) },
                  { label: 'End Date', value: formatDate(request.end_date) },
                  { label: 'Duration', value: formatDuration(request.total_minutes) },
                ],
              },
              {
                title: 'Result',
                wide: true,
                fields: [
                  { label: 'Task', value: formatValue(request.task_description) },
                  { label: 'Result', value: formatValue(request.result_description) },
                  { label: 'Talenta Status', value: formatValue(request.talenta_status) },  
                ],
              },
            ],
          }}
        />
      </div>
    </>
  )
}

export default DataTableReport
