import { useState } from 'react'
import Search from '../../components/search/Search.jsx'
import DataTableReport from '../../components/table/dekstop/DataTableReport.jsx'
import TabsReportOvertime from './TabsReportOvertime.jsx'

function ReportOvertime({ activePage, searchQuery }) {
  const [reqOvertimeRefreshKey] = useState(0)
  const [reportSearchQuery, setReportSearchQuery] = useState(searchQuery ?? '')
  const [talentaStatusFilter, setTalentaStatusFilter] = useState('')
  const pageTitle = activePage?.title ?? 'Report Overtime'
  const pageEyebrow = activePage?.eyebrow ?? 'Overtime'

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
            placeholder="Search report..."
            ariaLabel="Search report overtime"
          />
          {/* <ButtonCreateReqOvertime
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          />
          <ButtonCreateBulkReqOvertime
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          /> */}
        </div>
      </div>

      <TabsReportOvertime value={talentaStatusFilter} onChange={setTalentaStatusFilter} />

      <DataTableReport
        searchQuery={reportSearchQuery}
        talentaStatusFilter={talentaStatusFilter}
        tableLabel={`${pageTitle} table`}
        refreshKey={reqOvertimeRefreshKey}
      />
    </section>
  )
}

export default ReportOvertime
