import { useCallback, useEffect, useMemo, useState } from 'react'

import api from '../../../services/api.js'
import DataTable from '../DataTable.jsx'
import ButtonDeleteCompensation from '../../button/button-compensation/ButtonDeleteCompensation.jsx'
import ButtonEditCompensation from '../../button/button-compensation/ButtonEditCompensation.jsx'
import DialogDeleteCompensation from '../../Dialog/dialog-compensation/DialogDeleteCompensation.jsx'
import DialogEditCompensation from '../../Dialog/dialog-compensation/DialogEditCompensation.jsx'

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

function formatMultiplier(value) {
  const multiplier = Number(value)

  if (!Number.isFinite(multiplier)) {
    return formatValue(value)
  }

  return `${multiplier.toLocaleString('id-ID', {
    maximumFractionDigits: 2,
    minimumFractionDigits: multiplier % 1 === 0 ? 0 : 2,
  })}x`
}

function getFirstFilledValue(...values) {
  return values.find((value) => String(value ?? '').trim()) ?? null
}

function formatStatus(value) {
  return Number(value ?? 0) === 1 ? 'Active' : 'Inactive'
}

function getPaginationSummary(firstItem, lastItem, totalItems) {
  if (totalItems === 0) {
    return '0 dari 0 national holiday'
  }

  return `${firstItem}-${lastItem} dari ${totalItems} national holiday`
}

function createColumns({ onDelete, onEdit } = {}) {
  return [
    {
      key: 'id',
      header: 'ID',
      headerStyle: { width: '6%' },
      render: (request) => formatValue(request.id),
    },
    {
      key: 'holidayDate',
      header: 'Holiday Date',
      headerStyle: { width: '12%' },
      render: (request) => formatDate(request.holiday_date),
    },
    {
      key: 'name',
      header: 'Name',
      headerStyle: { width: '14%' },
      render: (request) => formatValue(request.name),
    },
    {
      key: 'multiplier',
      header: 'Multiplier',
      headerStyle: { width: '10%' },
      render: (request) => formatMultiplier(request.multiplier),
    },
    {
      key: 'description',
      header: 'Description',
      headerStyle: { width: '16%' },
      render: (request) => formatValue(request.description),
    },
    {
      key: 'status',
      header: 'Status',
      headerStyle: { width: '8%' },
      render: (request) => formatStatus(request.is_active),
    },
    {
      key: 'createdAt',
      header: 'Created At',
      headerStyle: { width: '12%' },
      render: (request) => formatDateTime(request.created_at),
    },
    {
      key: 'updatedAt',
      header: 'Updated At',
      headerStyle: { width: '12%' },
      render: (request) => formatDateTime(request.updated_at),
    },
    {
      key: 'action',
      header: 'Action',
      headerStyle: { width: '10%' },
      cellStyle: { width: '10%' },
      render: (request) => {
        const rowLabel = formatValue(getFirstFilledValue(
          request.name,
          request.holiday_date,
          request.id,
        ))

        return (
          <>
            <ButtonEditCompensation
              title={`Edit ${rowLabel}`}
              aria-label={`Edit national holiday ${rowLabel}`}
              onClick={(event) => {
                event.stopPropagation()
                onEdit?.(request)
              }}
            />

            <ButtonDeleteCompensation
              title={`Delete ${rowLabel}`}
              aria-label={`Delete national holiday ${rowLabel}`}
              onClick={(event) => {
                event.stopPropagation()
                onDelete?.(request)
              }}
            />
          </>
        )
      },
    },
  ]
}

function DataTableNationalHoliday({
  searchQuery = '',
  tableLabel = 'National Holiday',
  refreshKey = 0,
  onDelete,
  onEdit,
}) {
  const [requestRows, setRequestRows] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [editingCompensationType, setEditingCompensationType] = useState(null)
  const [deletingCompensationType, setDeletingCompensationType] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  useEffect(() => {
    let isMounted = true

    const loadRequests = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.nationalHolidays.list({
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
        setErrorMessage(error?.message || 'Gagal memuat data national holiday.')
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

  const handleOpenEditDialog = useCallback((compensationType) => {
    setEditingCompensationType(compensationType)
  }, [])

  const handleCloseEditDialog = useCallback(() => {
    setEditingCompensationType(null)
  }, [])

  const handleEditedCompensationType = useCallback((editedCompensationType, payload) => {
    onEdit?.(editedCompensationType, payload)
    setReloadKey((key) => key + 1)
  }, [onEdit])

  const handleOpenDeleteDialog = useCallback((compensationType) => {
    setDeletingCompensationType(compensationType)
  }, [])

  const handleCloseDeleteDialog = useCallback(() => {
    setDeletingCompensationType(null)
  }, [])

  const handleDeletedCompensationType = useCallback((deletedCompensationType) => {
    onDelete?.(deletedCompensationType)
    setReloadKey((key) => key + 1)
  }, [onDelete])

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
      ariaLabel: 'National holiday pagination',
      pageSizeAriaLabel: 'Jumlah national holiday per halaman',
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
    ? 'Memuat data national holiday...'
    : errorMessage || 'Belum ada national holiday untuk ditampilkan.'

  const columns = useMemo(
    () => createColumns({
      onDelete: handleOpenDeleteDialog,
      onEdit: handleOpenEditDialog,
    }),
    [handleOpenDeleteDialog, handleOpenEditDialog],
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
        />
      </div>
      <DialogEditCompensation
        isOpen={Boolean(editingCompensationType)}
        compensationType={editingCompensationType}
        title="Edit Compensation Type"
        onClose={handleCloseEditDialog}
        onEdited={handleEditedCompensationType}
      />
      <DialogDeleteCompensation
        isOpen={Boolean(deletingCompensationType)}
        compensationType={deletingCompensationType}
        title="Delete Compensation Type"
        onClose={handleCloseDeleteDialog}
        onDeleted={handleDeletedCompensationType}
      />
    </>
  )
}

export default DataTableNationalHoliday
