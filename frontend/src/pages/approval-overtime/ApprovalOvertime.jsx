import { useState } from 'react'

// import ButtonCreateBulkReqOvertime from '../../components/button/button-req-overtime/ButtonCreateBulkReqOvertime.jsx'
// import ButtonCreateApproval from '../../components/button/button-approval-overtime/ButtonCreateApproval.jsx'
import DataTableApprovalOvertime from '../../components/table/dekstop/DataTableApprovalOvertime.jsx'

function ApprovalOvertime({ activePage, searchQuery }) {
  const [reqOvertimeRefreshKey, setReqOvertimeRefreshKey] = useState(0)
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

        {/* <div className="users-table-card__actions">
          <ButtonCreateApproval
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          />
          <ButtonCreateApproval
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          />
        </div> */}
      </div>

      <DataTableApprovalOvertime
        searchQuery={searchQuery}
        tableLabel={`${pageTitle} table`}
        refreshKey={reqOvertimeRefreshKey}
      />
    </section>
  )
}

export default ApprovalOvertime
