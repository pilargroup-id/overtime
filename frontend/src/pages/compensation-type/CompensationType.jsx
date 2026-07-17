
import { useState } from 'react';

import ButtonCreateCompensation from '../../components/button/button-compensation/ButtonCreateCompensation';
import DataTableCompensationType from '../../components/table/dekstop/DataTableCompensationType.jsx'

function CompensationType({ activePage, searchQuery }) {
  const [compensationTypeRefreshKey, setCompensationTypeRefreshKey] = useState(0)
  const pageTitle = activePage?.title ?? 'Compensation Types'
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
          <ButtonCreateCompensation
            onCreated={() =>
              setCompensationTypeRefreshKey((currentKey) => currentKey + 1)
            }
          />
        </div>
      </div>

      <div className="dashboard-stack">
        <p className="dashboard-stack__text">
          Halaman compensation types terhubung ke endpoint master compensation types untuk
          membuat, mengubah, dan mengelola tipe kompensasi overtime.
        </p>
      </div>

      <DataTableCompensationType
        searchQuery={searchQuery}
        tableLabel={`${pageTitle} table`}
        refreshKey={compensationTypeRefreshKey}
      />

    </section>

  )
}

export default CompensationType
