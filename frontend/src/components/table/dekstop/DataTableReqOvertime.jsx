import { useEffect, useMemo, useState } from 'react'

import api from '../../../services/api.js'
import DataTable, {
  DataTableIdentity,
  DataTableStatus,
} from '../DataTable.jsx'
import DialogValidationCancelRO from '../../Dialog/dialog-req-overtime/DialogValidationCancelRO.jsx'
import ButtonCancelReqOvertime from '../../button/button-req-overtime/ButtonCancelReqOvertime.jsx'

const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500]

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

function formatSubmittedBy(request) {
  const submittedByFields = [
    'submitted_by_name',
    'submittedBy.name',
    'submitted_by_username',
    'submittedBy.username',
    'submitted_by_email',
    'submittedBy.email',
  ]

  for (const field of submittedByFields) {
    const value = getNestedValue(request, field)

    if (String(value ?? '').trim()) {
      return formatValue(value)
    }
  }

  return '-'
}

function formatSubmittedByMeta(request) {
  const submittedByMetaFields = [
    'submitted_by_email',
    'submittedBy.email',
    'submitted_by_username',
    'submittedBy.username',
  ]

  for (const field of submittedByMetaFields) {
    const value = getNestedValue(request, field)

    if (String(value ?? '').trim()) {
      return formatValue(value)
    }
  }

  return ''
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

function isCanceledStatus(status) {
  return String(status ?? '').toUpperCase() === 'CANCELED'
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
    headerStyle: { width: '18%' },
    cellStyle: { width: '18%' },
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
    headerStyle: { width: '14%' },
    cellStyle: { width: '14%' },
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
    headerStyle: { width: '9%'},
    render : (request) => formatValue(request.day_type)
  },
  {
    key: 'workDate',
    header: 'Work Date',
    headerStyle: { width: '11%' },
    cellStyle: { width: '11%' },
    render: (request) => formatDate(request.work_date),
  },
  {
    key: 'timeDuration',
    header: 'Time & Duration',
    headerStyle: { width: '15%' },
    cellStyle: { width: '15%' },
    render: (request) =>
      `${formatTime(request.start_time)} - ${formatTime(request.end_time)} (${formatDuration(
        request.total_minutes,
      )})`,
  },
  {
    key: 'compensation',
    header: 'Compensation',
    headerStyle: { width: '10%'},
    render : (request) => formatCompensation(request, compensationTypeMap)
  },
  {
    key: 'submittedBy',
    header: 'Submitted by',
    headerStyle: { width: '11%' },
    cellStyle: { width: '11%' },
    render: (request) => (
      <DataTableIdentity
        title={formatSubmittedBy(request)}
        subtitle={formatSubmittedByMeta(request)}
      />
    ),
  },
  {
    key: 'status',
    header: 'Status',
    headerStyle: { width: '16%' },
    cellStyle: { width: '16%' },
    render: (request) => (
      <DataTableStatus inline variant={getStatusVariant(request.status)}>
        {formatValue(request.status)}
      </DataTableStatus>
    ),
  },
]
}

function DataTableReqOvertime({
  searchQuery = '',
  tableLabel = 'Request Overtime table',
  refreshKey = 0,
}) {
  const [requestRows, setRequestRows] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [cancelingRequestId, setCancelingRequestId] = useState(null)
  const [cancelRequest, setCancelRequest] = useState(null)
  const [cancelErrorMessage, setCancelErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [compensationTypeMap, setCompensationTypeMap] = useState(() => new Map())

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

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
        const response = await api.overtimeRequests.list({
          page: currentPage,
          limit: pageSize,
          search: searchQuery,
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
  }, [currentPage, pageSize, refreshKey, reloadKey, searchQuery])

  const handleCancelRequest = (request) => {
    setCancelRequest(request)
    setCancelErrorMessage('')
  }

  const handleCloseCancelDialog = () => {
    if (cancelingRequestId) {
      return
    }

    setCancelRequest(null)
    setCancelErrorMessage('')
  }

  const handleConfirmCancelRequest = async () => {
    const requestId = cancelRequest?.id

    if (!requestId) {
      setCancelErrorMessage('Request overtime tidak memiliki ID untuk dibatalkan.')
      return
    }

    setCancelingRequestId(requestId)
    setCancelErrorMessage('')
    setErrorMessage('')

    try {
      await api.overtimeRequests.cancel(requestId)
      setRequestRows((rows) =>
        rows.map((row) =>
          String(row.id) === String(requestId) ? { ...row, status: 'CANCELED' } : row,
        ),
      )
      setCancelRequest(null)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setCancelErrorMessage(error?.message || 'Gagal membatalkan request overtime.')
    } finally {
      setCancelingRequestId(null)
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
      <div className="mtickets-table-shell req-overtime-table-shell">
        <DataTable
          className="mtickets-table"
          rows={requestRows}
          columns={columns}
          getRowId={(request, index) => request.id ?? request.request_number ?? index}
          tableLabel={tableLabel}
          emptyMessage={emptyMessage}
          pagination={pagination}
          detail={{
            buttonLabel: 'Detail request',
            buttonHidden: true,
            columnLabel: 'Action',
            indicatorColumnKey: 'request',
            headerStyle: { width: '12%', minWidth: '132px', textAlign: 'center' },
            cellStyle: { width: '12%', minWidth: '132px', textAlign: 'center' },
            eyebrow: 'Request Overtime',
            title: (request) => formatValue(request.request_number),
            actions: [
              {
                key: 'cancel',
                label: 'Cancel request',
                variant: 'danger',
                buttonComponent: ButtonCancelReqOvertime,
                hidden: (request) => isCanceledStatus(request.status),
                disabled: (request) => String(cancelingRequestId) === String(request.id),
                onClick: handleCancelRequest,
              },
            ],
            sections: (request) => [
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

      <DialogValidationCancelRO
        isOpen={Boolean(cancelRequest)}
        request={cancelRequest}
        isSubmitting={Boolean(cancelingRequestId)}
        errorMessage={cancelErrorMessage}
        onClose={handleCloseCancelDialog}
        onConfirm={handleConfirmCancelRequest}
      />
    </>
  )
}

export default DataTableReqOvertime
