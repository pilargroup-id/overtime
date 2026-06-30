import { useCallback, useEffect, useMemo, useState } from 'react'

import api from '../../../services/api.js'
import DataTable, { DataTableIdentity } from '../DataTable.jsx'
// button
import ButtonDeleteUserPermission from '../../button/button-user-permissions/ButtonDeleteUserPermission.jsx'
import ButtonEditUserPermission from '../../button/button-user-permissions/ButtonEditUserPermission.jsx'
// dialog
import DialogEditUserPermission from '../../Dialog/dialog-user-permissions/DialogEditUserPermission.jsx'
import DialogDeleteUserPermission from '../../Dialog/dialog-user-permissions/DialogDeleteUserPermission.jsx'

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

function getPaginationSummary(firstItem, lastItem, totalItems) {
  if (totalItems === 0) {
    return '0 dari 0 request'
  }

  return `${firstItem}-${lastItem} dari ${totalItems} request`
}

function createColumns({ onDelete, onEdit } = {}) {
  return [
  {
    key: 'user_id',
    header: 'Username',
    headerStyle: { width: '20%' },
    cellStyle: { width: '20%' },
    render: (request) => (
      <DataTableIdentity
        title={formatValue(getFirstFilledValue(
          request.user_name,
          request.username,
          request.user_id,
        ))}
        subtitle={formatValue(getFirstFilledValue(
          request.department_name,
          request.department_code,
          request.department_id,
        ))}
      />
    ),
  },
    {
    key: 'company',
    header: 'Company',
    headerStyle: { width: '10%'},
    render : (request) => formatValue(getFirstFilledValue(
      request.company_name,
      request.company_code,
      request.company_id,
    ))
  },
  {
    key: 'permissionType',
    header: 'Permission Type',
    headerStyle: { width: '10%'},
    render : (request) => formatValue(request.permission_type)
  },
    {
    key: 'scopeType',
    header: 'Scope Type',
    headerStyle: { width: '10%'},
    render : (request) => formatValue(request.scope_type)
  },
  {
    key: 'grantedBy',
    header: 'Granted By',
    headerStyle: { width: '15%' },
    cellStyle: { width: '15%' },
    render: (request) => formatValue(getFirstFilledValue(
      request.granted_by_name,
      request.granted_by_username,
      request.granted_by,
    )),
  },
  {
    key: 'action',
    header: 'Action',
    headerStyle: { width: '12%' },
    cellStyle: { width: '12%' },
    render: (request) => {
      const rowLabel = formatValue(getFirstFilledValue(
        request.user_name,
        request.username,
        request.user_id,
      ))

      return (
        <>
          <ButtonEditUserPermission
            title={`Edit ${rowLabel}`}
            aria-label={`Edit permission ${rowLabel}`}
            onClick={(event) => {
              event.stopPropagation()
              onEdit?.(request)
            }}
          />

          <ButtonDeleteUserPermission
            title={`Delete ${rowLabel}`}
            aria-label={`Delete permission ${rowLabel}`}
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

function DataTableUserPermission({
  searchQuery = '',
  tableLabel = 'User Permission',
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
  const [editingUserPermission, setEditingUserPermission] = useState(null)
  const [deletingUserPermission, setDeletingUserPermission] = useState(null)
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
        const response = await api.userPermissions.list({
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

  const handleOpenEditDialog = useCallback((userPermission) => {
    setEditingUserPermission(userPermission)
  }, [])

  const handleCloseEditDialog = useCallback(() => {
    setEditingUserPermission(null)
  }, [])

  const handleEditedUserPermission = useCallback((editedUserPermission, payload) => {
    onEdit?.(editedUserPermission, payload)
    setReloadKey((key) => key + 1)
  }, [onEdit])

  const handleOpenDeleteDialog = useCallback((userPermission) => {
    setDeletingUserPermission(userPermission)
  }, [])

  const handleCloseDeleteDialog = useCallback(() => {
    setDeletingUserPermission(null)
  }, [])

  const handleDeletedUserPermission = useCallback((deletedUserPermission) => {
    onDelete?.(deletedUserPermission)
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
      <DialogEditUserPermission
        isOpen={Boolean(editingUserPermission)}
        userPermission={editingUserPermission}
        title="Edit User Permission"
        onClose={handleCloseEditDialog}
        onEdited={handleEditedUserPermission}
      />
      <DialogDeleteUserPermission
        isOpen={Boolean(deletingUserPermission)}
        userPermission={deletingUserPermission}
        title="Delete User Permission"
        onClose={handleCloseDeleteDialog}
        onDeleted={handleDeletedUserPermission}
      />
    </>
  )
}

export default DataTableUserPermission
