import { useEffect, useState } from 'react'

import BackgroundMain from './components/template/BackgroundMain.jsx'
import Header from './components/template/Header.jsx'
import Sidebar from './components/template/Sidebar.jsx'
import RequestOvertime from './pages/req-overtime/ReqOvertime.jsx'
// import ApprovalOvertime from './pages/app-overtime/ApprovalOvertimePages.js'

function getCurrentPath() {
  if (typeof window === 'undefined') {
    return '/RequestOvertime'
  }

  return window.location.pathname === '/' ? '/RequestOvertime' : window.location.pathname
}

function App() {
  const [activePath, setActivePath] = useState(getCurrentPath)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const handleRouteChange = () => {
      setActivePath(getCurrentPath())
    }

    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  const shellClassName = [
    'dashboard-shell',
    sidebarCollapsed ? 'dashboard-shell--sidebar-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const renderContent = () => {
    switch (activePath) {
      case '/RequestOvertime':
        return <RequestOvertime />
      case '/ApprovalOvertime':
        return <ApprovalOvertime />
      default:
        return (
          <section className="dashboard-grid" aria-label="Not Found">
            <article className="dashboard-panel">
              <div className="dashboard-panel__header">
                <p className="dashboard-panel__eyebrow">404</p>
                <h1 className="dashboard-panel__title">Page Not Found</h1>
              </div>
              <div className="dashboard-stack">
                <p className="dashboard-stack__text">
                  Halaman yang Anda cari ({activePath}) tidak ditemukan atau belum diimplementasikan.
                </p>
              </div>
            </article>
          </section>
        )
    }
  }

  const getPageTitle = () => {
    switch (activePath) {
      case '/RequestOvertime':
        return 'Request Overtime'
      case '/ApprovalOvertime':
        return 'Approval Overtime'
      default:
        return 'Overtime App'
    }
  }

  return (
    <div className={shellClassName}>
      <BackgroundMain />

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        activePath={activePath}
        userName="Al Fatih"
        userRole="Frontend Developer"
        onToggleCollapse={() => setSidebarCollapsed((currentValue) => !currentValue)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <button
        type="button"
        className={`sidebar-overlay${mobileSidebarOpen ? ' active' : ''}`}
        aria-label="Close sidebar"
        onClick={() => setMobileSidebarOpen(false)}
      />

      <div className="dashboard-stage">
        <Header
          title="Overtime"
          showMenuButton
          onMenuToggle={() => setMobileSidebarOpen(true)}
          breadcrumb={[
            { label: 'Overtime', href: '#' },
            { label: getPageTitle(), href: '#', active: true },
          ]}
        />

        <main className="dashboard-main">
          <div className="dashboard-content">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
