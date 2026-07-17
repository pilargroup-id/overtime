import CreateButton from '../CreateButton.jsx'
import { XClose } from '../../template/TemplateIcons.jsx'

function ButtonMultiReject({ className = '', count = 0, children, ...buttonProps }) {
  const label = children ?? `Reject (${count})`

  return (
    <CreateButton
      {...buttonProps}
      variant="accordion"
      tone="danger"
      type="button"
      className={[
        'approval-overtime-bulk-button',
        'approval-overtime-bulk-button--reject',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={buttonProps['aria-label'] ?? label}
      title={buttonProps.title ?? label}
    >
      <XClose size={16} aria-hidden="true" />
      <span>{label}</span>
    </CreateButton>
  )
}

export default ButtonMultiReject
