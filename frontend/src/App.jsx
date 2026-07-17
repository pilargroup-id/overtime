import { useEffect, useState } from 'react'
import api from './services/api.js'

import BackgroundMain from './components/template/BackgroundMain.jsx'
import Header from './components/template/Header.jsx'
import Sidebar from './components/template/Sidebar.jsx'
import RequestOvertime from './pages/req-overtime/ReqOvertime.jsx'
import ApprovalOvertime from './pages/approval-overtime/ApprovalOvertime.jsx'
import ReportOvertime from './pages/report-overtime/ReportOvertime.jsx'
import UserPermission from './pages/user-permission/UserPermission.jsx'
import CompensationType from './pages/compensation-type/CompensationType.jsx'
import ApprovalRules from './pages/approval-rules/ApprovalRules.jsx'

const DEFAULT_USER_PROFILE = {
  name: 'Al Fatih',
  role: 'Frontend Developer',
}

function getCurrentPath() {
  if (typeof window === 'undefined') {
    return '/RequestOvertime'
  }

  return window.location.pathname === '/' ? '/RequestOvertime' : window.location.pathname
}

function getUserProfileFromAuthResponse(response) {
  const authUser = response?.data

  if (!authUser) {
    return DEFAULT_USER_PROFILE
  }

  return {
    name: authUser.name ?? authUser.username ?? DEFAULT_USER_PROFILE.name,
    role: authUser.job_position ?? authUser.department_name ?? DEFAULT_USER_PROFILE.role,
  }
}

function App() {
  const [activePath, setActivePath] = useState(getCurrentPath)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER_PROFILE)

  useEffect(() => {
    const handleRouteChange = () => {
      setActivePath(getCurrentPath())
    }

    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadCurrentUser = async () => {
      try {
        const response = await api.auth.me()

        if (!isMounted) {
          return
        }

        setCurrentUser(getUserProfileFromAuthResponse(response))
      } catch {
        if (!isMounted) {
          return
        }

        setCurrentUser(DEFAULT_USER_PROFILE)
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  const shellClassName = [
    'dashboard-shell',
    sidebarCollapsed ? 'dashboard-shell--sidebar-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const fixedTablePaths = [
    '/RequestOvertime',
    '/ApprovalOvertime',
    '/ReportOvertime',
    '/Master/UserPermissions',
    '/Master/CompensationType',
    '/Master/ApprovalRules',
  ]
  const isFixedTablePage = fixedTablePaths.includes(activePath)
  const mainClassName = [
    'dashboard-main',
    isFixedTablePage ? 'dashboard-main--table-fixed' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const contentClassName = [
    'dashboard-content',
    isFixedTablePage ? 'dashboard-content--table-fixed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const renderContent = () => {
    switch (activePath) {
      case '/RequestOvertime':
        return <RequestOvertime />
      case '/ApprovalOvertime':
        return <ApprovalOvertime />
      case '/ReportOvertime':
        return <ReportOvertime />
      case '/Master/UserPermissions':
        return <UserPermission />
      case '/Master/CompensationType':
        return <CompensationType />
      case '/Master/ApprovalRules':
        return <ApprovalRules /> 
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
      case '/ReportOvertime':
        return 'Report Overtime'
      case '/Master/UserPermissions':
        return 'User Permissions'
      case '/Maste/CompensationType':
        return 'Compensation Type'
      case '/Master/ApprovalRules':
        return 'ApprovalRules'
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
        userName={currentUser.name}
        userRole={currentUser.role}
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

        <main className={mainClassName}>
          <div className={contentClassName}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
