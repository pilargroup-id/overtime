
import { useState } from 'react';

import ButtonCreateApprovalRules from '../../components/button/button-approval-rules/ButtonCreateApprovalRules.jsx';
import DataTableApprovalRules from '../../components/table/dekstop/DataTableApprovalRules.jsx'

function ApprovalRules({ activePage, searchQuery }) {
  const [approvalRulesRefreshKey, setApprovalRulesRefreshKey] = useState(0)
  const pageTitle = activePage?.title ?? 'Approval Rules'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'

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
          <ButtonCreateApprovalRules
            onCreated={() =>
              setApprovalRulesRefreshKey((currentKey) => currentKey + 1)
            }
          />
        </div>
      </div>

      <div className="dashboard-stack">
        <p className="dashboard-stack__text">
          Halaman approval rules digunakan untuk mengelola aturan persetujuan (approval rules) overtime.
        </p>
      </div>

      <DataTableApprovalRules
        searchQuery={searchQuery}
        tableLabel={`${pageTitle} table`}
        refreshKey={approvalRulesRefreshKey}
      />

    </section>

  )
}

export default ApprovalRules
