import { useRef, useState } from 'react'

// import ButtonCreateBulkReqOvertime from '../../components/button/button-req-overtime/ButtonCreateBulkReqOvertime.jsx'
// import ButtonCreateApproval from '../../components/button/button-approval-overtime/ButtonCreateApproval.jsx'
import ButtonMultiApprove from '../../components/button/button-approval-overtime/ButtonMultiApprove.jsx'
import ButtonMultiReject from '../../components/button/button-approval-overtime/ButtonMultiReject.jsx'
import Search from '../../components/search/Search.jsx'
import DataTableApprovalOvertime from '../../components/table/dekstop/DataTableApprovalOvertime.jsx'
import FilterApprovalOvertime, {
  EMPTY_APPROVAL_FILTERS,
} from './FilterApprovalOvertime.jsx'
import TabsApprovalOvertime, { APPROVAL_OVERTIME_TABS } from './TabsApprovalOvertime.jsx'

const EMPTY_SELECTION = { count: 0, isApproving: false, isRejecting: false }

function ApprovalOvertime({ activePage, searchQuery }) {
  const [reqOvertimeRefreshKey] = useState(0)
  const [approvalSearchQuery, setApprovalSearchQuery] = useState(searchQuery ?? '')
  const [activeTab, setActiveTab] = useState(APPROVAL_OVERTIME_TABS.APPROVAL)
  const [filters, setFilters] = useState(EMPTY_APPROVAL_FILTERS)
  const [selection, setSelection] = useState(EMPTY_SELECTION)
  const dataTableRef = useRef(null)
  const pageTitle = activePage?.title ?? 'Request Overtime'

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card req-overtime-page"
      aria-label={pageTitle}
    >
      <div className="users-table-card__header">
        <TabsApprovalOvertime value={activeTab} onChange={setActiveTab} />

        <div className="users-table-card__actions">
          {selection.count > 0 ? (
            <>
              <ButtonMultiApprove
                count={selection.count}
                disabled={selection.isApproving}
                onClick={() => dataTableRef.current?.approveSelected()}
              />
              <ButtonMultiReject
                count={selection.count}
                disabled={selection.isRejecting}
                onClick={() => dataTableRef.current?.rejectSelected()}
              />
            </>
          ) : null}
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
        <FilterApprovalOvertime
          filters={filters}
          mode={activeTab}
          refreshKey={reqOvertimeRefreshKey}
          onChange={setFilters}
        />
      </div>

      <DataTableApprovalOvertime
        ref={dataTableRef}
        key={`${activeTab}-${approvalSearchQuery}-${Object.values(filters).join('-')}`}
        searchQuery={approvalSearchQuery}
        filters={filters}
        mode={activeTab}
        tableLabel={`${pageTitle} table`}
        refreshKey={reqOvertimeRefreshKey}
        onSelectionChange={setSelection}
      />
    </section>
  )
}

export default ApprovalOvertime
