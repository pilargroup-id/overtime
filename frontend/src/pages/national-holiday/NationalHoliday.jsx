
import { useState } from 'react';

import ButtonCreateNationalHoliday from '../../components/button/button-national/ButtonCreateNationalHoliday.jsx';
import DataTableNationalHoliday from '../../components/table/dekstop/DataTableNationalHoliday.jsx'

function NationalHoliday({ activePage, searchQuery }) {
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
          <ButtonCreateNationalHoliday
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

      <DataTableNationalHoliday
        searchQuery={searchQuery}
        tableLabel={`${pageTitle} table`}
        refreshKey={compensationTypeRefreshKey}
      />

    </section>

  )
}

export default NationalHoliday
