import { useState } from 'react'
import Search from '../../components/search/Search.jsx'
import DataTableReport from '../../components/table/dekstop/DataTableReport.jsx'
import DataTableReportHistory from '../../components/table/dekstop/DataTableReportHistory.jsx'
import FilterReportOvertime, { EMPTY_REPORT_FILTERS } from './FilterReportOvertime.jsx'
import TabsReportOvertime from './TabsReportOvertime.jsx'

const HISTORY_TAB_VALUE = 'HISTORY'

function ReportOvertime({ activePage, searchQuery }) {
  const [reqOvertimeRefreshKey] = useState(0)
  const [reportSearchQuery, setReportSearchQuery] = useState(searchQuery ?? '')
  const [talentaStatusFilter, setTalentaStatusFilter] = useState('')
  const [filters, setFilters] = useState(EMPTY_REPORT_FILTERS)
  const pageTitle = activePage?.title ?? 'Report Overtime'

  const isHistoryTab = talentaStatusFilter === HISTORY_TAB_VALUE

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card req-overtime-page"
      aria-label={pageTitle}
    >
      <div className="users-table-card__header">
        <TabsReportOvertime value={talentaStatusFilter} onChange={setTalentaStatusFilter} />

        <div className="users-table-card__actions">
          <Search
            value={reportSearchQuery}
            onChange={setReportSearchQuery}
            placeholder={isHistoryTab ? 'Search history...' : 'Search report...'}
            ariaLabel={isHistoryTab ? 'Search history request overtime' : 'Search report overtime'}
          />
        </div>
      </div>

      <div className="approval-overtime-filters-backdrop">
        <FilterReportOvertime
          filters={filters}
          isHistory={isHistoryTab}
          refreshKey={reqOvertimeRefreshKey}
          onChange={setFilters}
        />
      </div>

      {isHistoryTab ? (
        <DataTableReportHistory
          key={`history-${reportSearchQuery}-${Object.values(filters).join('-')}`}
          searchQuery={reportSearchQuery}
          filters={filters}
          tableLabel={`${pageTitle} - History table`}
          refreshKey={reqOvertimeRefreshKey}
        />
      ) : (
        <DataTableReport
          key={`report-${talentaStatusFilter}-${reportSearchQuery}-${Object.values(filters).join('-')}`}
          searchQuery={reportSearchQuery}
          talentaStatusFilter={talentaStatusFilter}
          filters={filters}
          tableLabel={`${pageTitle} table`}
          refreshKey={reqOvertimeRefreshKey}
        />
      )}
    </section>
  )
}

export default ReportOvertime
