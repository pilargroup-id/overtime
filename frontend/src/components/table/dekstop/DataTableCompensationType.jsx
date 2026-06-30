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

function getFirstFilledValue(...values) {
  return values.find((value) => String(value ?? '').trim()) ?? null
}

function formatStatus(value) {
  return Number(value ?? 0) === 1 ? 'Active' : 'Inactive'
}

function getPaginationSummary(firstItem, lastItem, totalItems) {
  if (totalItems === 0) {
    return '0 dari 0 compensation type'
  }

  return `${firstItem}-${lastItem} dari ${totalItems} compensation type`
}

function createColumns({ onDelete, onEdit } = {}) {
  return [
    {
      key: 'code',
      header: 'Code',
      headerStyle: { width: '10%' },
      render: (request) => formatValue(getFirstFilledValue(request.code)),
    },
    {
      key: 'nameCompensation',
      header: 'Compensation',
      headerStyle: { width: '10%' },
      render: (request) => formatValue(request.name),
    },
    {
      key: 'compensationKind',
      header: 'Compensation Kind',
      headerStyle: { width: '10%' },
      render: (request) => formatValue(request.compensation_kind),
    },
    {
      key: 'amount',
      header: 'Amount',
      headerStyle: { width: '10%' },
      render: (request) => formatValue(request.amount),
    },
    {
      key: 'leaveDays',
      header: 'Leave Days',
      headerStyle: { width: '10%' },
      render: (request) => formatValue(request.leave_days),
    },
    {
      key: 'status',
      header: 'Status',
      headerStyle: { width: '8%' },
      render: (request) => formatStatus(request.is_active),
    },
    {
      key: 'description',
      header: 'Description',
      headerStyle: { width: '18%' },
      render: (request) => formatValue(request.description),
    },
    {
      key: 'action',
      header: 'Action',
      headerStyle: { width: '12%' },
      cellStyle: { width: '12%' },
      render: (request) => {
        const rowLabel = formatValue(getFirstFilledValue(
          request.name,
          request.code,
          request.id,
        ))

        return (
          <>
            <ButtonEditCompensation
              title={`Edit ${rowLabel}`}
              aria-label={`Edit compensation type ${rowLabel}`}
              onClick={(event) => {
                event.stopPropagation()
                onEdit?.(request)
              }}
            />

            <ButtonDeleteCompensation
              title={`Delete ${rowLabel}`}
              aria-label={`Delete compensation type ${rowLabel}`}
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

function DataTableCompensationType({
  searchQuery = '',
  tableLabel = 'Compensation Type',
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
        const response = await api.compensationTypes.list({
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
        setErrorMessage(error?.message || 'Gagal memuat data compensation type.')
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
      ariaLabel: 'Compensation type pagination',
      pageSizeAriaLabel: 'Jumlah compensation type per halaman',
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
    ? 'Memuat data compensation type...'
    : errorMessage || 'Belum ada compensation type untuk ditampilkan.'

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

export default DataTableCompensationType
