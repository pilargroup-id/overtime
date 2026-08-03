import { useEffect, useMemo, useState } from 'react'

import ButtonCreateReqOvertime from '../../components/button/button-req-overtime/ButtonCreateReqOvertime.jsx'
import Dropdown from '../../components/forms/dropdown/Dropdown.jsx'
import Search from '../../components/search/Search.jsx'
import DataTableReqOvertime from '../../components/table/dekstop/DataTableReqOvertime.jsx'
import api from '../../services/api.js'

const EMPTY_FILTERS = {
  requestId: '',
  departmentId: '',
  dayType: '',
  status: '',
  submittedBy: '',
}

function normalizeResponseRows(responseData) {
  if (Array.isArray(responseData)) return responseData
  if (Array.isArray(responseData?.data)) return responseData.data
  if (Array.isArray(responseData?.rows)) return responseData.rows
  if (Array.isArray(responseData?.results)) return responseData.results
  return []
}

function createUniqueOptions(rows, getValue, getLabel) {
  const optionMap = new Map()

  rows.forEach((row) => {
    const value = getValue(row)
    const label = getLabel(row)

    if (value !== null && value !== undefined && String(value).trim() && String(label ?? '').trim()) {
      optionMap.set(String(value), String(label))
    }
  })

  return [...optionMap.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((first, second) => first.label.localeCompare(second.label, 'id'))
}

function getSubmittedByLabel(request) {
  return (
    request.submitted_by_name ||
    request.submitted_by_username ||
    request.submitted_by_email ||
    request.submitted_by
  )
}

function canUseBulkReqOvertime(userPermissions = []) {
  return userPermissions.some(
    (permission) =>
      permission?.permission_type === 'REQUEST_CREATE_ALL' &&
      permission?.scope_type === 'GLOBAL',
  )
}

function ReqOvertimePages({ activePage, searchQuery, userPermissions = [] }) {
  const [reqOvertimeRefreshKey, setReqOvertimeRefreshKey] = useState(0)
  const [requestSearchQuery, setRequestSearchQuery] = useState(searchQuery ?? '')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterRows, setFilterRows] = useState([])
  const pageTitle = activePage?.title ?? 'Request Overtime'
  const pageEyebrow = activePage?.eyebrow ?? 'Overtime'
  const hasBulkReqOvertimeAccess = canUseBulkReqOvertime(userPermissions)

  useEffect(() => {
    let isMounted = true

    const loadFilterRows = async () => {
      try {
        const firstResponse = await api.overtimeRequests.list({ page: 1, limit: 100 })
        const firstRows = normalizeResponseRows(firstResponse)
        const totalPages = Math.max(1, Number(firstResponse?.meta?.totalPages) || 1)
        const remainingResponses = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.overtimeRequests.list({ page: index + 2, limit: 100 }),
          ),
        )

        if (isMounted) {
          setFilterRows([
            ...firstRows,
            ...remainingResponses.flatMap((response) => normalizeResponseRows(response)),
          ])
        }
      } catch {
        if (isMounted) setFilterRows([])
      }
    }

    loadFilterRows()

    return () => {
      isMounted = false
    }
  }, [reqOvertimeRefreshKey])

  const filterOptions = useMemo(
    () => ({
      requests: createUniqueOptions(
        filterRows,
        (request) => request.id,
        (request) =>
          [request.request_number, request.employee_name_snapshot].filter(Boolean).join(' — '),
      ),
      departments: createUniqueOptions(
        filterRows,
        (request) => request.department_id,
        (request) => request.department_name_snapshot,
      ),
      dayTypes: createUniqueOptions(
        filterRows,
        (request) => request.day_type,
        (request) => request.day_type,
      ),
      statuses: createUniqueOptions(
        filterRows,
        (request) => request.status,
        (request) => request.status,
      ),
      submitters: createUniqueOptions(
        filterRows,
        (request) => request.submitted_by,
        getSubmittedByLabel,
      ),
    }),
    [filterRows],
  )

  const updateFilter = (filterName) => (value) => {
    setFilters((currentFilters) => ({ ...currentFilters, [filterName]: value }))
  }

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card req-overtime-page"
      aria-label={pageTitle}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{pageEyebrow}</p>
          <h1 className="dashboard-panel__title">{pageTitle}</h1>
        </div>

        <div className="users-table-card__actions">
          <Search
            value={requestSearchQuery}
            onChange={setRequestSearchQuery}
            placeholder="Search request..."
            ariaLabel="Search request overtime"
          />
          <ButtonCreateReqOvertime
            canUseBulkRequest={hasBulkReqOvertimeAccess}
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <div className="req-overtime-filters" aria-label="Filter request overtime">
        <Dropdown
          id="request-overtime-filter-request"
          label="Request"
          value={filters.requestId}
          options={[{ value: '', label: 'All requests' }, ...filterOptions.requests]}
          onChange={updateFilter('requestId')}
        />
        <Dropdown
          id="request-overtime-filter-department"
          label="Department"
          value={filters.departmentId}
          options={[{ value: '', label: 'All departments' }, ...filterOptions.departments]}
          onChange={updateFilter('departmentId')}
        />
        <Dropdown
          id="request-overtime-filter-day-type"
          label="Day type"
          value={filters.dayType}
          options={[{ value: '', label: 'All day types' }, ...filterOptions.dayTypes]}
          onChange={updateFilter('dayType')}
        />
        <Dropdown
          id="request-overtime-filter-status"
          label="Status"
          value={filters.status}
          options={[{ value: '', label: 'All statuses' }, ...filterOptions.statuses]}
          onChange={updateFilter('status')}
        />
        <Dropdown
          id="request-overtime-filter-submitted-by"
          label="Submitted by"
          value={filters.submittedBy}
          options={[{ value: '', label: 'All submitters' }, ...filterOptions.submitters]}
          onChange={updateFilter('submittedBy')}
        />
      </div>

      <DataTableReqOvertime
        key={`${requestSearchQuery}-${Object.values(filters).join('-')}`}
        searchQuery={requestSearchQuery}
        filters={filters}
        tableLabel={`${pageTitle} table`}
        refreshKey={reqOvertimeRefreshKey}
      />
    </section>
  )
}

export default ReqOvertimePages
