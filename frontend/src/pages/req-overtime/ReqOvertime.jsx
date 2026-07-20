import { useState } from 'react'

import ButtonCreateBulkReqOvertime from '../../components/button/button-req-overtime/ButtonCreateBulkReqOvertime.jsx'
import ButtonCreateReqOvertime from '../../components/button/button-req-overtime/ButtonCreateReqOvertime.jsx'
import Search from '../../components/search/Search.jsx'
import DataTableReqOvertime from '../../components/table/dekstop/DataTableReqOvertime.jsx'

function ReqOvertimePages({ activePage, searchQuery }) {
  const [reqOvertimeRefreshKey, setReqOvertimeRefreshKey] = useState(0)
  const [requestSearchQuery, setRequestSearchQuery] = useState(searchQuery ?? '')
  const pageTitle = activePage?.title ?? 'Request Overtime'
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
            value={requestSearchQuery}
            onChange={setRequestSearchQuery}
            placeholder="Search request..."
            ariaLabel="Search request overtime"
          />
          <ButtonCreateReqOvertime
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          />
          <ButtonCreateBulkReqOvertime
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      <DataTableReqOvertime
        searchQuery={requestSearchQuery}
        tableLabel={`${pageTitle} table`}
        refreshKey={reqOvertimeRefreshKey}
      />
    </section>
  )
}

export default ReqOvertimePages
