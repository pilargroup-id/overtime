import {
  FileText01,
  LayoutDashboard,
  LogOutLeft01,
  Ticket01,
  Table01,
  Chart01,
  Folder,
  TrendingUp,
} from '../../components/template/TemplateIcons.jsx'

export const defaultNavigationPath = '/dashboard'

export const implementedNavigationPaths = [
  '/RequestOvertime',
  '/ApprovalOvertime',
  '/ReportOvertime',
  '/Master',
  '/Master/CompensationType',
  '/Master/UserPermissions',
  '/Master/ApprovalRules',
]

export const primaryNavigationItems = [
  {
    id: 'RequestOvertime',
    label: 'Request Overtime',
    href: '/RequestOvertime',
    icon: Ticket01,
  },
  {
    id: 'ApprovalOvertime',
    label: 'Approval Overtime',
    href: '/ApprovalOvertime',
    icon: TrendingUp,
  },
  {
    id: 'report-overtime',
    label: 'Report Overtime',
    href: '/ReportOvertime',
  icon: Chart01,
  },
  {
    id: 'master',
    label: 'Master',
    href: '/Master',
    icon: Table01,
    children: [
      {
        id: 'compensation-type',
        label: 'Compensation Types',
        href: '/Master/CompensationType',
      },
      {
        id : 'user-permissions',
        label: 'User Permissions',
        href: '/Master/UserPermissions',
      },
      {
        id: 'approval-rules',
        label: 'Approval Rules',
        href: 'Master/ApprovalRules'
      }
    ]
  },
]

export const secondaryNavigationItems = [
  {
    id: 'back-pilargroup',
    label: 'Back Pilargroup',
    href: 'https://pilargroup.id/dashboard',
    icon: LogOutLeft01,
    external: true,
  },
]
