import CreateButton from '../CreateButton.jsx'
import { Check } from '../../template/TemplateIcons.jsx'

function ButtonMultiApprove({ className = '', count = 0, children, ...buttonProps }) {
  const label = children ?? `Approve (${count})`

  return (
    <CreateButton
      {...buttonProps}
      variant="accordion"
      type="button"
      className={[
        'approval-overtime-bulk-button',
        'approval-overtime-bulk-button--approve',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={buttonProps['aria-label'] ?? label}
      title={buttonProps.title ?? label}
    >
      <Check size={16} aria-hidden="true" />
      <span>{label}</span>
    </CreateButton>
  )
}

export default ButtonMultiApprove
