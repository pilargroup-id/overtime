import { AlertCircle, Clock } from '../../components/layoute/TemplateIcons.jsx'

const REPORT_STATUS_TABS = [
  { label: 'Pending', value: 'PENDING', icon: AlertCircle },
  { label: 'History', value: 'HISTORY', icon: Clock },
]

function TabsReportOvertime({ value, onChange }) {
  return (
    <div className="report-overtime-tabs" role="tablist" aria-label="Filter status report overtime">
      {REPORT_STATUS_TABS.map((tab) => (
        <button
          key={tab.value || 'all'}
          role="tab"
          type="button"
          className={[
            'report-overtime-tabs__tab',
            value === tab.value ? 'report-overtime-tabs__tab--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
        >
          <tab.icon className="report-overtime-tabs__icon" size={16} />
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default TabsReportOvertime
