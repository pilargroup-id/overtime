import { useEffect, useMemo, useState } from 'react'

import Dropdown from '../../components/forms/dropdown/Dropdown.jsx'
import api from '../../services/api.js'

export const EMPTY_REPORT_FILTERS = {
  dayType: '',
  workDateFrom: '',
  workDateTo: '',
  compensationTypeId: '',
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

function getSubmittedByLabel(row) {
  return (
    row.submitted_by_name ||
    row.submitted_by_username ||
    row.submitted_by_email ||
    row.submitted_by
  )
}

function getCompensationLabel(row) {
  return row.compensation_name || row.compensation_type_name || row.compensation_code || row.compensation_type_id
}

function FilterReportOvertime({ filters, isHistory = false, refreshKey = 0, onChange }) {
  const [filterRows, setFilterRows] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadFilterRows = async () => {
      try {
        const listFn = isHistory ? api.overtimeReports.history : api.overtimeReports.list
        const firstResponse = await listFn({ page: 1, limit: 100 })
        const firstRows = normalizeResponseRows(firstResponse)
        const totalPages = Math.max(1, Number(firstResponse?.meta?.totalPages) || 1)
        const remainingResponses = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            listFn({ page: index + 2, limit: 100 }),
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
  }, [isHistory, refreshKey])

  const filterOptions = useMemo(
    () => ({
      dayTypes: createUniqueOptions(
        filterRows,
        (row) => row.day_type,
        (row) => row.day_type,
      ),
      compensations: createUniqueOptions(
        filterRows,
        (row) => row.compensation_type_id,
        getCompensationLabel,
      ),
      submitters: createUniqueOptions(
        filterRows,
        (row) => row.submitted_by,
        getSubmittedByLabel,
      ),
    }),
    [filterRows],
  )

  const updateFilter = (filterName) => (value) => {
    onChange?.({ ...filters, [filterName]: value })
  }

  return (
    <div className="approval-overtime-filters" aria-label="Filter report overtime">
      <Dropdown
        id="report-overtime-filter-day-type"
        label="Day type"
        value={filters.dayType}
        options={[{ value: '', label: 'All day types' }, ...filterOptions.dayTypes]}
        onChange={updateFilter('dayType')}
      />
      <div className="approval-overtime-filter-field approval-overtime-filter-field--date">
        <label className="form-control__label" htmlFor="report-overtime-filter-work-date-from">
          <span>Work date</span>
        </label>
        <div className="approval-overtime-filter-date">
          <input
            id="report-overtime-filter-work-date-from"
            className="approval-overtime-filter-date__input"
            type="date"
            value={filters.workDateFrom}
            onChange={(event) => updateFilter('workDateFrom')(event.target.value)}
            aria-label="Work date from"
          />
          <span className="approval-overtime-filter-date__separator">to</span>
          <input
            className="approval-overtime-filter-date__input"
            type="date"
            value={filters.workDateTo}
            min={filters.workDateFrom || undefined}
            onChange={(event) => updateFilter('workDateTo')(event.target.value)}
            aria-label="Work date to"
          />
        </div>
      </div>
      <Dropdown
        id="report-overtime-filter-compensation"
        label="Compensation"
        value={filters.compensationTypeId}
        options={[{ value: '', label: 'All compensations' }, ...filterOptions.compensations]}
        onChange={updateFilter('compensationTypeId')}
      />
      <Dropdown
        id="report-overtime-filter-submitted-by"
        label="Submitted by"
        value={filters.submittedBy}
        options={[{ value: '', label: 'All submitters' }, ...filterOptions.submitters]}
        onChange={updateFilter('submittedBy')}
      />
    </div>
  )
}

export default FilterReportOvertime
