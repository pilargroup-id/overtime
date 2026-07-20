import { useState } from 'react'
import DataTableReport from '../../components/table/dekstop/DataTableReport.jsx'
import TabsReportOvertime from './TabsReportOvertime.jsx'

function ReportOvertime({ activePage, searchQuery }) {
  const [reqOvertimeRefreshKey, setReqOvertimeRefreshKey] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
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
          {/* <ButtonCreateReqOvertime
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          />
          <ButtonCreateBulkReqOvertime
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          /> */}
        </div>
      </div>

      <TabsReportOvertime value={statusFilter} onChange={setStatusFilter} />

      <DataTableReport
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        tableLabel={`${pageTitle} table`}
        refreshKey={reqOvertimeRefreshKey}
      />
    </section>
  )
}

export default ReportOvertime
