import { useState } from 'react'

// import ButtonCreateBulkReqOvertime from '../../components/button/button-req-overtime/ButtonCreateBulkReqOvertime.jsx'
// import ButtonCreateApproval from '../../components/button/button-approval-overtime/ButtonCreateApproval.jsx'
import Search from '../../components/search/Search.jsx'
import DataTableApprovalOvertime from '../../components/table/dekstop/DataTableApprovalOvertime.jsx'
import FilterApprovalOvertime, {
  EMPTY_APPROVAL_FILTERS,
} from './FilterApprovalOvertime.jsx'
import TabsApprovalOvertime, { APPROVAL_OVERTIME_TABS } from './TabsApprovalOvertime.jsx'

function ApprovalOvertime({ activePage, searchQuery }) {
  const [reqOvertimeRefreshKey] = useState(0)
  const [approvalSearchQuery, setApprovalSearchQuery] = useState(searchQuery ?? '')
  const [activeTab, setActiveTab] = useState(APPROVAL_OVERTIME_TABS.APPROVAL)
  const [filters, setFilters] = useState(EMPTY_APPROVAL_FILTERS)
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
            value={approvalSearchQuery}
            onChange={setApprovalSearchQuery}
            placeholder="Search approval..."
            ariaLabel="Search approval overtime"
          />
          {/* <ButtonCreateApproval
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          />
          <ButtonCreateApproval
            onCreated={() => setReqOvertimeRefreshKey((currentKey) => currentKey + 1)}
          />
          */}
        </div>
      </div>

      <div className="approval-overtime-filters-backdrop">
        <TabsApprovalOvertime value={activeTab} onChange={setActiveTab} />
        <FilterApprovalOvertime
          filters={filters}
          mode={activeTab}
          refreshKey={reqOvertimeRefreshKey}
          onChange={setFilters}
        />
      </div>

      <DataTableApprovalOvertime
        key={`${activeTab}-${approvalSearchQuery}-${Object.values(filters).join('-')}`}
        searchQuery={approvalSearchQuery}
        filters={filters}
        mode={activeTab}
        tableLabel={`${pageTitle} table`}
        refreshKey={reqOvertimeRefreshKey}
      />
    </section>
  )
}

export default ApprovalOvertime
