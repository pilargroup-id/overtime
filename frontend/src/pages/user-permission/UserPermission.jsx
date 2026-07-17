
import { useState } from 'react';

import ButtonCreateUserPermission from '../../components/button/button-user-permissions/ButtonCreateUserPermission';
import DataTableUserPermission from '../../components/table/dekstop/DataTableUserPermission.jsx'

function UserPermission({ activePage, searchQuery }) {
  const [userPermissionRefreshKey, setUserPermissionRefreshKey] = useState(0)
  const pageTitle = activePage?.title ?? 'User Permissions'
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
          <ButtonCreateUserPermission
            onCreated={() =>
              setUserPermissionRefreshKey((currentKey) => currentKey + 1)
            }
          />
        </div>
      </div>

      <div className="dashboard-stack">
        <p className="dashboard-stack__text">
          Halaman user permissions sudah terhubung ke menu dan siap dilanjutkan untuk isi tabel
          atau form akses user.
        </p>
      </div>

      <DataTableUserPermission
        searchQuery={searchQuery}
        tableLabel={`${pageTitle} table`}
        refreshKey={userPermissionRefreshKey}
      />

    </section>

  )
}

export default UserPermission
