import { useEffect, useMemo, useRef, useState } from 'react'

import api from '../../../services/api.js'
import DataTable, {
  DataTableIdentity,
  DataTableStatus,
} from '../DataTable.jsx'

// import-button 
import ButtonApprove from '../../button/button-approval-overtime/ButtonApprove.jsx'
import ButtonReject from '../../button/button-approval-overtime/ButtonReject.jsx'
import ButtonMultiApprove from '../../button/button-approval-overtime/ButtonMultiApprove.jsx'
import ButtonMultiReject from '../../button/button-approval-overtime/ButtonMultiReject.jsx'

// import-dialog
import DialogValidationApproveRO from '../../Dialog/dialog-approval-overtime/DialogValidationApproveRO.jsx'

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
  const requestStatus = row?.request_status ?? row?.overtime_request_status ?? row?.request?.status

  if (requestStatus) {
    return requestStatus
  }

  const status = String(row?.status ?? '').toUpperCase()

  return ['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELED'].includes(status) ? row.status : ''
}

function getApprovalStatus(row) {
  const approvalStatus = row?.approval_status ?? row?.approval?.status

  if (approvalStatus) {
    return approvalStatus
  }

  const status = String(row?.status ?? '').toUpperCase()

  return ['PENDING', 'APPROVED', 'REJECTED', 'CANCELED'].includes(status) ? row.status : ''
}

function normalizeStatus(value) {
  return String(value ?? '').trim().toUpperCase()
}

function getApprovalId(row) {
  return row?.approval_id ?? row?.id
}

function getApprovalRowId(row, index) {
  return row.id ?? row.approval_id ?? row.request_id ?? index
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
  const approvalStatus = normalizeStatus(getApprovalStatus(row))
  const requestStatus = normalizeStatus(getRequestStatus(row))
  const finalStatuses = ['APPROVED', 'REJECTED', 'CANCELED']

  if (finalStatuses.includes(approvalStatus) || finalStatuses.includes(requestStatus)) {
    return false
  }

  return approvalStatus === 'PENDING' || requestStatus === 'SUBMITTED' || !approvalStatus
}

function getPaginationSummary(firstItem, lastItem, totalItems) {
  if (totalItems === 0) {
    return '0 dari 0 approval'
  }

  return `${firstItem}-${lastItem} dari ${totalItems} approval`
}

function DataTableSelectionCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  onChange,
}) {
  const checkboxRef = useRef(null)

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      className="approval-overtime-table__checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={(event) => event.stopPropagation()}
      onChange={onChange}
    />
  )
}

function createColumns(
  compensationTypeMap,
  {
    showSelection,
    selectedApprovalIds,
    isAllCurrentPageSelected,
    isSomeCurrentPageSelected,
    hasCurrentPageRows,
    onToggleAllCurrentPage,
    onToggleRow,
  },
) {
  return [
    ...(showSelection
      ? [
          {
            key: 'select',
            header: (
              <DataTableSelectionCheckbox
                checked={isAllCurrentPageSelected}
                indeterminate={isSomeCurrentPageSelected}
                disabled={!hasCurrentPageRows}
                ariaLabel="Pilih semua approval overtime di halaman ini"
                onChange={(event) => onToggleAllCurrentPage(event.target.checked)}
              />
            ),
            headerClassName: 'approval-overtime-table__select-header',
            cellClassName: 'approval-overtime-table__select-cell',
            headerStyle: { width: '30px', minWidth: '30px', textAlign: 'center' },
            cellStyle: { width: '30px', minWidth: '30px', textAlign: 'center' },
            render: (row, index) => {
              const rowId = String(getApprovalRowId(row, index))
              const isSelectable = isPendingRow(row) && Boolean(getApprovalId(row))

              return (
                <DataTableSelectionCheckbox
                  checked={selectedApprovalIds.has(rowId)}
                  disabled={!isSelectable}
                  ariaLabel={`Pilih approval overtime ${formatValue(row.request_number)}`}
                  onChange={(event) => onToggleRow(row, index, event.target.checked)}
                />
              )
            },
          },
        ]
      : []),
    {
      key: 'request',
      header: 'Request',
      headerClassName: 'approval-overtime-table__request-header',
      cellClassName: 'approval-overtime-table__request-cell',
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
  statusFilter = '',
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
  const [selectedApprovalIds, setSelectedApprovalIds] = useState(() => new Set())
  const [approvalDialog, setApprovalDialog] = useState({
    action: 'approve',
    request: null,
    requests: [],
    errorMessage: '',
  })
  const showSelection = normalizeStatus(statusFilter) === 'PENDING'

  useEffect(() => {
    setCurrentPage(1)
    setSelectedApprovalIds(new Set())
  }, [searchQuery, statusFilter])

  const selectableApprovalRows = useMemo(
    () =>
      showSelection
        ? approvalRows
            .map((row, index) => ({ row, index, rowId: String(getApprovalRowId(row, index)) }))
            .filter(({ row }) => isPendingRow(row) && Boolean(getApprovalId(row)))
        : [],
    [approvalRows, showSelection],
  )
  const currentPageApprovalIds = useMemo(
    () => selectableApprovalRows.map(({ rowId }) => rowId),
    [selectableApprovalRows],
  )

  useEffect(() => {
    const currentPageIdSet = new Set(currentPageApprovalIds)

    setSelectedApprovalIds((currentSelectedIds) => {
      const nextSelectedIds = new Set(
        [...currentSelectedIds].filter((approvalId) => currentPageIdSet.has(approvalId)),
      )

      return nextSelectedIds.size === currentSelectedIds.size
        ? currentSelectedIds
        : nextSelectedIds
    })
  }, [currentPageApprovalIds])

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
          status: statusFilter,
          request_status: statusFilter === 'PENDING' ? 'SUBMITTED' : '',
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
  }, [currentPage, pageSize, refreshKey, reloadKey, searchQuery, statusFilter])

  const handleOpenApprovalDialog = (row, action) => {
    if (!isPendingRow(row)) {
      setErrorMessage('Hanya approval dengan status PENDING dan request SUBMITTED yang bisa diproses.')
      return
    }

    const approvalId = getApprovalId(row)

    if (!approvalId) {
      setErrorMessage('Approval ID untuk row ini tidak ditemukan.')
      return
    }

    setErrorMessage('')
    setApprovalDialog({
      action,
      request: row,
      requests: [],
      errorMessage: '',
    })
  }

  const handleOpenBulkApprovalDialog = (action) => {
    const selectedRows = selectableApprovalRows
      .filter(({ rowId }) => selectedApprovalIds.has(rowId))
      .map(({ row }) => row)

    if (selectedRows.length === 0) {
      setErrorMessage('Pilih minimal satu approval overtime yang masih PENDING.')
      return
    }

    setErrorMessage('')
    setApprovalDialog({
      action,
      request: selectedRows[0] ?? null,
      requests: selectedRows,
      errorMessage: '',
    })
  }

  const handleToggleAllCurrentPage = (checked) => {
    setSelectedApprovalIds(() => (checked ? new Set(currentPageApprovalIds) : new Set()))
  }

  const handleToggleApprovalRow = (row, index, checked) => {
    const rowId = String(getApprovalRowId(row, index))

    setSelectedApprovalIds((currentSelectedIds) => {
      const nextSelectedIds = new Set(currentSelectedIds)

      if (checked) {
        nextSelectedIds.add(rowId)
      } else {
        nextSelectedIds.delete(rowId)
      }

      return nextSelectedIds
    })
  }

  const handleCloseApprovalDialog = () => {
    if (processingApprovalAction) {
      return
    }

    setApprovalDialog({
      action: 'approve',
      request: null,
      requests: [],
      errorMessage: '',
    })
  }

  const handleConfirmApprovalAction = async (note) => {
    const row = approvalDialog.request
    const action = approvalDialog.action
    const bulkRows = approvalDialog.requests ?? []
    const isBulkAction = bulkRows.length > 1
    const approvalId = getApprovalId(row)

    if (!isBulkAction && !approvalId) {
      setApprovalDialog((currentDialog) => ({
        ...currentDialog,
        errorMessage: 'Approval ID untuk request ini tidak ditemukan.',
      }))
      return
    }

    const trimmedNote = String(note ?? '').trim()

    if (!trimmedNote) {
      setApprovalDialog((currentDialog) => ({
        ...currentDialog,
        errorMessage: 'Note wajib diisi sebelum melanjutkan approval.',
      }))
      return
    }

    if (isBulkAction) {
      const approvalIds = bulkRows.map(getApprovalId).filter(Boolean)

      if (approvalIds.length === 0) {
        setApprovalDialog((currentDialog) => ({
          ...currentDialog,
          errorMessage: 'Approval ID untuk request terpilih tidak ditemukan.',
        }))
        return
      }

      setProcessingApprovalAction(`bulk:${action}`)
      setErrorMessage('')
      setApprovalDialog((currentDialog) => ({
        ...currentDialog,
        errorMessage: '',
      }))

      try {
        await (action === 'approve'
          ? api.overtimeApprovals.bulkApprove({ ids: approvalIds, note: trimmedNote })
          : api.overtimeApprovals.bulkReject({ ids: approvalIds, note: trimmedNote }))

        setSelectedApprovalIds(new Set())
        setApprovalDialog({
          action: 'approve',
          request: null,
          requests: [],
          errorMessage: '',
        })
        setReloadKey((key) => key + 1)
      } catch (error) {
        setApprovalDialog((currentDialog) => ({
          ...currentDialog,
          errorMessage:
            error?.message ||
            `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} approval overtime.`,
        }))
      } finally {
        setProcessingApprovalAction('')
      }

      return
    }

    setProcessingApprovalAction(`${action}:${approvalId}`)
    setErrorMessage('')
    setApprovalDialog((currentDialog) => ({
      ...currentDialog,
      errorMessage: '',
    }))

    try {
      const response =
        action === 'approve'
          ? await api.overtimeApprovals.approve(approvalId, { note: trimmedNote })
          : await api.overtimeApprovals.reject(approvalId, { note: trimmedNote })

      const nextRow = response?.data ?? null

      if (nextRow) {
        setApprovalRows((rows) =>
          rows.map((currentRow) =>
            String(getApprovalId(currentRow)) === String(approvalId)
              ? {
                  ...currentRow,
                  ...nextRow,
                  id: currentRow.id ?? nextRow.approval_id,
                  approval_id: nextRow.approval_id ?? currentRow.approval_id,
                  status: nextRow.approval_status ?? nextRow.status ?? currentRow.status,
                  request_status: nextRow.request_status ?? currentRow.request_status,
                  note: trimmedNote,
                  acted_at: nextRow.acted_at ?? nextRow.updated_at ?? new Date().toISOString(),
                }
              : currentRow,
          ),
        )
      } else {
        setApprovalRows((rows) =>
          rows.map((currentRow) =>
            String(getApprovalId(currentRow)) === String(approvalId)
              ? {
                  ...currentRow,
                  status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                  approval_status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                  request_status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                  note: trimmedNote,
                  acted_at: new Date().toISOString(),
                }
              : currentRow,
          ),
        )
      }

      setApprovalDialog({
        action: 'approve',
        request: null,
        requests: [],
        errorMessage: '',
      })
      setSelectedApprovalIds((currentSelectedIds) => {
        const nextSelectedIds = new Set(currentSelectedIds)
        nextSelectedIds.delete(String(getApprovalRowId(row, 0)))
        nextSelectedIds.delete(String(approvalId))
        return nextSelectedIds
      })
      setReloadKey((key) => key + 1)
    } catch (error) {
      setApprovalDialog((currentDialog) => ({
        ...currentDialog,
        errorMessage:
          error?.message ||
          `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} approval overtime.`,
      }))
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

  const selectedCurrentPageCount = currentPageApprovalIds.filter((approvalId) =>
    selectedApprovalIds.has(approvalId),
  ).length
  const hasCurrentPageRows = currentPageApprovalIds.length > 0
  const isAllCurrentPageSelected =
    hasCurrentPageRows && selectedCurrentPageCount === currentPageApprovalIds.length
  const isSomeCurrentPageSelected =
    selectedCurrentPageCount > 0 && selectedCurrentPageCount < currentPageApprovalIds.length

  const columns = useMemo(
    () =>
      createColumns(compensationTypeMap, {
        showSelection,
        selectedApprovalIds,
        isAllCurrentPageSelected,
        isSomeCurrentPageSelected,
        hasCurrentPageRows,
        onToggleAllCurrentPage: handleToggleAllCurrentPage,
        onToggleRow: handleToggleApprovalRow,
      }),
    [
      compensationTypeMap,
      hasCurrentPageRows,
      isAllCurrentPageSelected,
      isSomeCurrentPageSelected,
      selectedApprovalIds,
      showSelection,
    ],
  )

  return (
    <>
      {errorMessage && approvalRows.length > 0 ? (
        <p className="register-user-popup__hint" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="mtickets-table-shell req-overtime-table-shell approval-overtime-table-shell">
        {showSelection && selectedCurrentPageCount > 0 ? (
          <div className="approval-overtime-bulk-toolbar" aria-live="polite">
            <span className="approval-overtime-bulk-toolbar__count">
              {selectedCurrentPageCount} dipilih
            </span>
            <div className="approval-overtime-bulk-toolbar__actions">
              <ButtonMultiApprove
                count={selectedCurrentPageCount}
                disabled={processingApprovalAction === 'bulk:approve'}
                onClick={() => handleOpenBulkApprovalDialog('approve')}
              />
              <ButtonMultiReject
                count={selectedCurrentPageCount}
                disabled={processingApprovalAction === 'bulk:reject'}
                onClick={() => handleOpenBulkApprovalDialog('reject')}
              />
            </div>
          </div>
        ) : null}
        <DataTable
          className="mtickets-table"
          rows={approvalRows}
          columns={columns}
          getRowId={getApprovalRowId}
          getRowClassName={(row, index) =>
            showSelection && selectedApprovalIds.has(String(getApprovalRowId(row, index)))
              ? 'approval-overtime-table__row--selected'
              : ''
          }
          tableLabel={tableLabel}
          emptyMessage={emptyMessage}
          pagination={pagination}
          detail={{
            buttonLabel: 'Detail request',
            buttonHidden: true,
            columnLabel: 'Action',
            indicatorColumnKey: 'request',
            headerStyle: { width: '18%', minWidth: '204px', textAlign: 'center' },
            cellStyle: { width: '18%', minWidth: '204px', textAlign: 'center' },
            eyebrow: 'Approval Overtime',
            title: (row) => formatValue(row.request_number),
            actions: [
              {
                key: 'approve',
                label: 'Approve',
                buttonComponent: ButtonApprove,
                disabled: (row) =>
                  processingApprovalAction === `approve:${getApprovalId(row)}`,
                onClick: (row) => handleOpenApprovalDialog(row, 'approve'),
              },
              {
                key: 'reject',
                label: 'Reject',
                variant: 'danger',
                buttonComponent: ButtonReject,
                disabled: (row) =>
                  processingApprovalAction === `reject:${getApprovalId(row)}`,
                onClick: (row) => handleOpenApprovalDialog(row, 'reject'),
              },
            ],
            sections: (row) => [
              // {
              //   title: 'Employee',
              //   fields: [
              //     { label: 'Name', value: formatValue(row.employee_name_snapshot) },
              //     { label: 'Employee ID', value: formatValue(row.employee_internal_id_snapshot) },
              //     { label: 'Department', value: formatValue(row.department_name_snapshot) },
              //     { label: 'Company', value: formatValue(row.company_name_snapshot) },
              //   ],
              // },
              // {
              //   title: 'Approval',
              //   fields: [
              //     { label: 'Approval Status', value: formatValue(getApprovalStatus(row)) },
              //     { label: 'Request Status', value: formatValue(getRequestStatus(row)) },
              //     { label: 'Approver', value: formatValue(row.approver_name_snapshot) },
              //     { label: 'Approval Time', value: formatDateTime(getApprovalTimeValue(row)) },
              //   ],
              // },
              // {
              //   title: 'Overtime',
              //   fields: [
              //     { label: 'Day Type', value: formatValue(row.day_type) },
              //     { label: 'Work Date', value: formatDate(row.work_date) },
              //     { label: 'End Date', value: formatDate(row.end_date) },
              //     { label: 'Duration', value: formatDuration(row.total_minutes) },
              //   ],
              // },
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

      <DialogValidationApproveRO
        isOpen={Boolean(approvalDialog.request)}
        request={approvalDialog.request}
        action={approvalDialog.action}
        selectedCount={approvalDialog.requests?.length ?? 0}
        isSubmitting={Boolean(processingApprovalAction)}
        errorMessage={approvalDialog.errorMessage}
        onClose={handleCloseApprovalDialog}
        onConfirm={handleConfirmApprovalAction}
      />
    </>
  )
}

export default DataTableApprovalOvertime
