import { useState } from 'react';

import ButtonCreateNationalHoliday from '../../components/button/button-national/ButtonCreateNationalHoliday.jsx';
import DataTableNationalHoliday from '../../components/table/dekstop/DataTableNationalHoliday.jsx'

function NationalHoliday({ activePage, searchQuery }) {
  const [nationalHolidayRefreshKey, setNationalHolidayRefreshKey] = useState(0)
  const pageTitle = activePage?.title ?? 'National Holidays'
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
              setNationalHolidayRefreshKey((currentKey) => currentKey + 1)
            }
          />
        </div>
      </div>

      <DataTableNationalHoliday
        searchQuery={searchQuery}
        tableLabel={`${pageTitle} table`}
        refreshKey={nationalHolidayRefreshKey}
      />

    </section>

  )
}

export default NationalHoliday
