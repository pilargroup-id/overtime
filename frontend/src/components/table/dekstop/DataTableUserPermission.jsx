import { useCallback, useEffect, useMemo, useState } from 'react'

import api from '../../../services/api.js'
import DataTable, { DataTableIdentity } from '../DataTable.jsx'
// button
import ButtonDeleteUserPermission from '../../button/button-user-permissions/ButtonDeleteUserPermission.jsx'
import ButtonEditUserPermission from '../../button/button-user-permissions/ButtonEditUserPermission.jsx'
// dialog
import DialogEditUserPermission from '../../Dialog/dialog-user-permissions/DialogEditUserPermission.jsx'
import DialogDeleteUserPermission from '../../Dialog/dialog-user-permissions/DialogDeleteUserPermission.jsx'

const DEFAULT_PAGE_SIZE = 25
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

function summarizeUniqueValues(values) {
  const uniqueValues = []

  values.forEach((value) => {
    const displayValue = formatValue(value)

    if (displayValue !== '-' && !uniqueValues.includes(displayValue)) {
      uniqueValues.push(displayValue)
    }
  })

  if (uniqueValues.length === 0) {
    return '-'
  }

  if (uniqueValues.length === 1) {
    return uniqueValues[0]
  }

  return `${uniqueValues[0]} +${uniqueValues.length - 1} lainnya`
}

function getRequestCompany(request) {
  return getFirstFilledValue(request.company_name, request.company_code, request.company_id)
}

function getRequestDepartment(request) {
  return getFirstFilledValue(request.department_name, request.department_code, request.department_id)
}

function getRequestGrantedBy(request) {
  return getFirstFilledValue(request.granted_by_name, request.granted_by_username, request.granted_by)
}

function getRequestUserLabel(request) {
  return getFirstFilledValue(request.user_name, request.username, request.user_id)
}

function groupPermissionsByUser(rows) {
  const groups = new Map()

  rows.forEach((request) => {
    const groupId = String(getFirstFilledValue(request.user_id, request.username, request.user_name) ?? '-')

    if (!groups.has(groupId)) {
      groups.set(groupId, {
        groupId,
        userName: getRequestUserLabel(request),
        permissions: [],
      })
    }

    groups.get(groupId).permissions.push(request)
  })

  return Array.from(groups.values()).map((group) => ({
    ...group,
    departmentSummary: summarizeUniqueValues(group.permissions.map(getRequestDepartment)),
    companySummary: summarizeUniqueValues(group.permissions.map(getRequestCompany)),
    grantedBySummary: summarizeUniqueValues(group.permissions.map(getRequestGrantedBy)),
    permissionTypes: Array.from(
      new Set(group.permissions.map((permission) => formatValue(permission.permission_type))),
    ),
  }))
}

function createGroupColumns() {
  return [
    {
      key: 'user',
      header: 'Username',
      headerStyle: { width: '28%' },
      cellStyle: { width: '28%' },
      render: (group) => (
        <DataTableIdentity
          title={formatValue(group.userName)}
          subtitle={group.departmentSummary}
        />
      ),
    },
    {
      key: 'company',
      header: 'Company',
      headerStyle: { width: '22%' },
      render: (group) => group.companySummary,
    },
    {
      key: 'permissionTypes',
      header: 'Permission Type',
      type: 'chips',
      headerStyle: { width: '25%' },
      render: (group) => group.permissionTypes,
    },
    {
      key: 'grantedBy',
      header: 'Granted By',
      headerStyle: { width: '15%' },
      render: (group) => group.grantedBySummary,
    },
  ]
}

function createDetailConfig({ onDelete, onEdit } = {}) {
  return {
    columnLabel: 'Action',
    eyebrow: 'User Permission',
    title: (group) => formatValue(group.userName),
    description: (group) =>
      `${group.permissions.length} permission${group.permissions.length > 1 ? 's' : ''} terdaftar`,
    sections: (group) =>
      group.permissions.map((permission, permissionIndex) => {
        const rowLabel = formatValue(getRequestUserLabel(permission))

        return {
          title: `#${permissionIndex + 1} — ${formatValue(getRequestCompany(permission))}`,
          wide: true,
          fields: [
            { label: 'Company', value: formatValue(getRequestCompany(permission)) },
            { label: 'Permission Type', value: formatValue(permission.permission_type) },
            { label: 'Scope Type', value: formatValue(permission.scope_type) },
            { label: 'Granted By', value: formatValue(getRequestGrantedBy(permission)) },
            {
              label: 'Action',
              render: () => (
                <>
                  <ButtonEditUserPermission
                    title={`Edit ${rowLabel}`}
                    aria-label={`Edit permission ${rowLabel}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onEdit?.(permission)
                    }}
                  />

                  <ButtonDeleteUserPermission
                    title={`Delete ${rowLabel}`}
                    aria-label={`Delete permission ${rowLabel}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete?.(permission)
                    }}
                  />
                </>
              ),
            },
          ],
        }
      }),
  }
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

  const groupedRows = useMemo(() => groupPermissionsByUser(requestRows), [requestRows])

  const columns = useMemo(() => createGroupColumns(), [])

  const detail = useMemo(
    () => createDetailConfig({
      onDelete: handleOpenDeleteDialog,
      onEdit: handleOpenEditDialog,
    }),
    [handleOpenDeleteDialog, handleOpenEditDialog],
  )

  return (
    <>
      <div className="mtickets-table-shell req-overtime-table-shell user-permission-table-shell overtime-pagination-bottom">
        <DataTable
          className="mtickets-table"
          rows={groupedRows}
          columns={columns}
          getRowId={(group, index) => group.groupId ?? index}
          tableLabel={tableLabel}
          emptyMessage={emptyMessage}
          pagination={pagination}
          detail={detail}
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
