import { useState } from 'react'
import Search from '../../components/search/Search.jsx'
import DataTableReport from '../../components/table/dekstop/DataTableReport.jsx'
import DataTableReportHistory from '../../components/table/dekstop/DataTableReportHistory.jsx'
import TabsReportOvertime from './TabsReportOvertime.jsx'

const HISTORY_TAB_VALUE = 'HISTORY'

function ReportOvertime({ activePage, searchQuery }) {
  const [reqOvertimeRefreshKey] = useState(0)
  const [reportSearchQuery, setReportSearchQuery] = useState(searchQuery ?? '')
  const [talentaStatusFilter, setTalentaStatusFilter] = useState('')
  const pageTitle = activePage?.title ?? 'Report Overtime'
  const pageEyebrow = activePage?.eyebrow ?? 'Overtime'

  const isHistoryTab = talentaStatusFilter === HISTORY_TAB_VALUE

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
            value={reportSearchQuery}
            onChange={setReportSearchQuery}
            placeholder={isHistoryTab ? 'Search history...' : 'Search report...'}
            ariaLabel={isHistoryTab ? 'Search history request overtime' : 'Search report overtime'}
          />
        </div>
      </div>

      <TabsReportOvertime value={talentaStatusFilter} onChange={setTalentaStatusFilter} />

      {isHistoryTab ? (
        <DataTableReportHistory
          searchQuery={reportSearchQuery}
          tableLabel={`${pageTitle} - History table`}
          refreshKey={reqOvertimeRefreshKey}
        />
      ) : (
        <DataTableReport
          searchQuery={reportSearchQuery}
          talentaStatusFilter={talentaStatusFilter}
          tableLabel={`${pageTitle} table`}
          refreshKey={reqOvertimeRefreshKey}
        />
      )}
    </section>
  )
}

export default ReportOvertime
