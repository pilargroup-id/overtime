import { useEffect, useMemo, useState } from 'react'

import api from '../../../services/api.js'
import DataTable, {
  DataTableIdentity,
  DataTableStatus,
} from '../DataTable.jsx'
import { FileText01 } from '../../template/TemplateIcons.jsx'

const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

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

function formatDateTime(value) {
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
    hour: '2-digit',
    minute: '2-digit',
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

function formatCompensation(row, compensationTypeMap) {
  const compensationNameFields = [
    'compensation_name',
    'compensation_type_name',
    'compensationType.name',
    'compensationType.code',
    'compensation_type.name',
    'compensation_type.code',
  ]

  for (const field of compensationNameFields) {
    const value = getNestedValue(row, field)

    if (String(value ?? '').trim()) {
      return formatValue(value)
    }
  }

  const mappedName = compensationTypeMap.get(String(row.compensation_type_id))

  return mappedName ? formatValue(mappedName) : formatValue(row.compensation_type_id)
}

function getRequestStatus(row) {
  return row?.request_status ?? row?.status ?? ''
}

function getApprovalStatus(row) {
  return row?.status ?? row?.approval_status ?? ''
}

function getApprovalTimeValue(row) {
  return row?.acted_at ?? row?.approved_at ?? row?.rejected_at ?? row?.updated_at ?? null
}

function getStatusVariant(status) {
  const normalizedStatus = String(status ?? '').toUpperCase()

  if (normalizedStatus === 'APPROVED') {
    return 'active'
  }

  if (normalizedStatus === 'SUBMITTED' || normalizedStatus === 'PENDING') {
    return 'pending'
  }

  if (normalizedStatus === 'REJECTED' || normalizedStatus === 'CANCELED') {
    return 'inactive'
  }

  return 'app'
}

function isPendingRow(row) {
  return (
    String(getApprovalStatus(row)).toUpperCase() === 'PENDING' &&
    String(getRequestStatus(row)).toUpperCase() === 'SUBMITTED'
  )
}

function getPaginationSummary(firstItem, lastItem, totalItems) {
  if (totalItems === 0) {
    return '0 dari 0 approval'
  }

  return `${firstItem}-${lastItem} dari ${totalItems} approval`
}

function createColumns(compensationTypeMap) {
  return [
    {
      key: 'request',
      header: 'Request',
      headerStyle: { width: '23%' },
      cellStyle: { width: '23%' },
      render: (row) => (
        <DataTableIdentity
          title={formatValue(row.employee_name_snapshot)}
          subtitle={formatValue(row.request_number)}
        />
      ),
    },
    {
      key: 'department',
      header: 'Department & Company',
      headerStyle: { width: '15%' },
      cellStyle: { width: '15%' },
      render: (row) => (
        <DataTableIdentity
          title={formatValue(row.department_name_snapshot)}
          subtitle={formatValue(row.company_name_snapshot)}
        />
      ),
    },
    {
      key: 'dayType',
      header: 'Day Type',
      headerStyle: { width: '10%' },
      render: (row) => formatValue(row.day_type),
    },
    {
      key: 'workDate',
      header: 'Work Date',
      headerStyle: { width: '15%' },
      cellStyle: { width: '15%' },
      render: (row) => formatDate(row.work_date),
    },
    {
      key: 'time',
      header: 'Time',
      headerStyle: { width: '15%' },
      cellStyle: { width: '15%' },
      render: (row) => `${formatTime(row.start_time)} - ${formatTime(row.end_time)}`,
    },
    {
      key: 'duration',
      header: 'Duration',
      headerStyle: { width: '12%' },
      cellStyle: { width: '12%' },
      render: (row) => formatDuration(row.total_minutes),
    },
    {
      key: 'approvalTime',
      header: 'Approval Time',
      headerStyle: { width: '16%' },
      cellStyle: { width: '16%' },
      render: (row) => formatDateTime(getApprovalTimeValue(row)),
    },
    {
      key: 'compensation',
      header: 'Compensation',
      headerStyle: { width: '10%' },
      render: (row) => formatCompensation(row, compensationTypeMap),
    },
    {
      key: 'status',
      header: 'Status',
      headerStyle: { width: '22%' },
      cellStyle: { width: '22%' },
      render: (row) => (
        <DataTableStatus inline variant={getStatusVariant(getRequestStatus(row))}>
          {formatValue(getRequestStatus(row))}
        </DataTableStatus>
      ),
    },
  ]
}

function DataTableApprovalOvertime({
  searchQuery = '',
  tableLabel = 'Approval Overtime table',
  refreshKey = 0,
}) {
  const [approvalRows, setApprovalRows] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [processingApprovalAction, setProcessingApprovalAction] = useState('')
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

    const loadApprovals = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.overtimeApprovals.list({
          page: currentPage,
          limit: pageSize,
          search: searchQuery,
        })

        if (!isMounted) {
          return
        }

        const rows = normalizeResponseRows(response)
        const meta = normalizeResponseMeta(response, rows.length, pageSize)

        setApprovalRows(rows)
        setTotalItems(meta.total)
        setTotalPages(meta.totalPages)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setApprovalRows([])
        setTotalItems(0)
        setTotalPages(1)
        setErrorMessage(error?.message || 'Gagal memuat data approval overtime.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadApprovals()

    return () => {
      isMounted = false
    }
  }, [currentPage, pageSize, refreshKey, reloadKey, searchQuery])

  const handleApprovalAction = async (row, action) => {
    const approvalId = row?.id ?? row?.approval_id

    if (!approvalId) {
      setErrorMessage('Approval ID untuk row ini tidak ditemukan.')
      return
    }

    setProcessingApprovalAction(`${action}:${approvalId}`)
    setErrorMessage('')

    try {
      const response =
        action === 'approve'
          ? await api.overtimeApprovals.approve(approvalId)
          : await api.overtimeApprovals.reject(approvalId)

      const nextRow = response?.data ?? null

      if (nextRow) {
        setApprovalRows((rows) =>
          rows.map((currentRow) =>
            String(currentRow.id ?? currentRow.approval_id) === String(approvalId)
              ? { ...currentRow, ...nextRow }
              : currentRow,
          ),
        )
      } else {
        setApprovalRows((rows) =>
          rows.map((currentRow) =>
            String(currentRow.id ?? currentRow.approval_id) === String(approvalId)
              ? {
                  ...currentRow,
                  status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                  request_status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                  acted_at: new Date().toISOString(),
                }
              : currentRow,
          ),
        )
      }

      setReloadKey((key) => key + 1)
    } catch (error) {
      setErrorMessage(
        error?.message ||
          `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} approval overtime.`,
      )
    } finally {
      setProcessingApprovalAction('')
    }
  }

  const safeCurrentPage = Math.min(currentPage, totalPages)
  const firstItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const lastItem = totalItems === 0 ? 0 : Math.min(firstItem + approvalRows.length - 1, totalItems)

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
      ariaLabel: 'Approval overtime pagination',
      pageSizeAriaLabel: 'Jumlah approval overtime per halaman',
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
    ? 'Memuat data approval overtime...'
    : errorMessage || 'Belum ada approval overtime untuk ditampilkan.'

  const columns = useMemo(() => createColumns(compensationTypeMap), [compensationTypeMap])

  return (
    <>
      {errorMessage && approvalRows.length > 0 ? (
        <p className="register-user-popup__hint" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="mtickets-table-shell req-overtime-table-shell">
        <DataTable
          className="mtickets-table"
          rows={approvalRows}
          columns={columns}
          getRowId={(row, index) => row.id ?? row.approval_id ?? row.request_id ?? index}
          tableLabel={tableLabel}
          emptyMessage={emptyMessage}
          pagination={pagination}
          detail={{
            buttonLabel: 'Detail request',
            buttonIcon: FileText01,
            buttonIconOnly: true,
            columnLabel: 'Action',
            eyebrow: 'Approval Overtime',
            title: (row) => formatValue(row.request_number),
            description: (row) => formatValue(row.task_description),
            actions: [
              {
                key: 'approve',
                label: 'Approve',
                hidden: (row) => !isPendingRow(row),
                disabled: (row) =>
                  processingApprovalAction === `approve:${row.id ?? row.approval_id}`,
                onClick: (row) => handleApprovalAction(row, 'approve'),
              },
              {
                key: 'reject',
                label: 'Reject',
                variant: 'danger',
                hidden: (row) => !isPendingRow(row),
                disabled: (row) =>
                  processingApprovalAction === `reject:${row.id ?? row.approval_id}`,
                onClick: (row) => handleApprovalAction(row, 'reject'),
              },
            ],
            sections: (row) => [
              {
                title: 'Employee',
                fields: [
                  { label: 'Name', value: formatValue(row.employee_name_snapshot) },
                  { label: 'Employee ID', value: formatValue(row.employee_internal_id_snapshot) },
                  { label: 'Department', value: formatValue(row.department_name_snapshot) },
                  { label: 'Company', value: formatValue(row.company_name_snapshot) },
                ],
              },
              {
                title: 'Approval',
                fields: [
                  { label: 'Approval Status', value: formatValue(getApprovalStatus(row)) },
                  { label: 'Request Status', value: formatValue(getRequestStatus(row)) },
                  { label: 'Approver', value: formatValue(row.approver_name_snapshot) },
                  { label: 'Approval Time', value: formatDateTime(getApprovalTimeValue(row)) },
                ],
              },
              {
                title: 'Overtime',
                fields: [
                  { label: 'Day Type', value: formatValue(row.day_type) },
                  { label: 'Work Date', value: formatDate(row.work_date) },
                  { label: 'End Date', value: formatDate(row.end_date) },
                  { label: 'Duration', value: formatDuration(row.total_minutes) },
                ],
              },
              {
                title: 'Result',
                wide: true,
                fields: [
                  { label: 'Task', value: formatValue(row.task_description) },
                  { label: 'Result', value: formatValue(row.result_description) },
                  { label: 'Talenta Status', value: formatValue(row.talenta_status) },
                  { label: 'Note', value: formatValue(row.note) },
                ],
              },
            ],
          }}
        />
      </div>
    </>
  )
}

export default DataTableApprovalOvertime
