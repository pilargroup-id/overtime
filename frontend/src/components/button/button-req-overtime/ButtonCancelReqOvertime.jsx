import CreateButton from '../CreateButton.jsx'
import { XClose } from '../../template/TemplateIcons.jsx'

function ButtonCancelReqOvertime({ className = '', title = 'Cancel request', ...buttonProps }) {
  return (
    <CreateButton
      {...buttonProps}
      variant="bareIcon"
      type="button"
      tone="danger"
      className={[
        'req-overtime-action-button',
        'user-permission-action-button',
        'parent-action-button',
        'parent-action-button--delete',
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

export default ButtonCancelReqOvertime
