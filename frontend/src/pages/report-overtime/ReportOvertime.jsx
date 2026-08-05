import { useRef, useState } from 'react'
import Search from '../../components/search/Search.jsx'
import DataTableReport, {
  TalentaBulkButton,
} from '../../components/table/dekstop/DataTableReport.jsx'
import DataTableReportHistory from '../../components/table/dekstop/DataTableReportHistory.jsx'
import FilterReportOvertime, { EMPTY_REPORT_FILTERS } from './FilterReportOvertime.jsx'
import TabsReportOvertime from './TabsReportOvertime.jsx'

const HISTORY_TAB_VALUE = 'HISTORY'
const TALENTA_STATUS_PROCESSED = 'PROCESSED'
const EMPTY_SELECTION = { count: 0, isProcessing: false }

function ReportOvertime({ activePage, searchQuery }) {
  const [reqOvertimeRefreshKey] = useState(0)
  const [reportSearchQuery, setReportSearchQuery] = useState(searchQuery ?? '')
  const [talentaStatusFilter, setTalentaStatusFilter] = useState('')
  const [filters, setFilters] = useState(EMPTY_REPORT_FILTERS)
  const [selection, setSelection] = useState(EMPTY_SELECTION)
  const dataTableRef = useRef(null)
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
          {!isHistoryTab && selection.count > 0 ? (
            <TalentaBulkButton
              status={TALENTA_STATUS_PROCESSED}
              count={selection.count}
              disabled={selection.isProcessing}
              isLoading={selection.isProcessing}
              onClick={() => dataTableRef.current?.markSelectedProcessed()}
            />
          ) : null}
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
          ref={dataTableRef}
          key={`report-${talentaStatusFilter}-${reportSearchQuery}-${Object.values(filters).join('-')}`}
          searchQuery={reportSearchQuery}
          talentaStatusFilter={talentaStatusFilter}
          filters={filters}
          tableLabel={`${pageTitle} table`}
          refreshKey={reqOvertimeRefreshKey}
          onSelectionChange={setSelection}
        />
      )}
    </section>
  )
}

export default ReportOvertime
