import CreateButton from '../CreateButton.jsx'
import { XClose } from '../../template/TemplateIcons.jsx'

function ButtonReject({ className = '', title = 'Reject', ...buttonProps }) {
  return (
    <CreateButton
      {...buttonProps}
      variant="bareIcon"
      type="button"
      tone="danger"
      className={[
        'approval-overtime-action-button',
        'approval-overtime-action-button--reject',
        'user-permission-action-button',
        'parent-action-button',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={buttonProps['aria-label'] ?? title}
      title={title}
    >
      <XClose size={24} aria-hidden="true" />
    </CreateButton>
  )
}

export default ButtonReject
