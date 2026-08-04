import { CheckCircle, Clock } from '../../components/layoute/TemplateIcons.jsx'

export const APPROVAL_OVERTIME_TABS = {
  APPROVAL: 'approval',
  HISTORY: 'history',
}

const APPROVAL_TABS = [
  { label: 'Approval', value: APPROVAL_OVERTIME_TABS.APPROVAL, icon: CheckCircle },
  { label: 'History', value: APPROVAL_OVERTIME_TABS.HISTORY, icon: Clock },
]

function TabsApprovalOvertime({ value, onChange }) {
  return (
    <div className="approval-overtime-tabs" role="tablist" aria-label="Filter approval overtime">
      {APPROVAL_TABS.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          className={[
            'approval-overtime-tabs__tab',
            value === tab.value ? 'approval-overtime-tabs__tab--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
        >
          <tab.icon className="approval-overtime-tabs__icon" size={16} />
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default TabsApprovalOvertime