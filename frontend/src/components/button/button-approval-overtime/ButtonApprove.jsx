import CreateButton from '../CreateButton.jsx'
import { CheckCircle } from '../../template/TemplateIcons.jsx'

function ButtonApprove({ className = '', title = 'Approve', ...buttonProps }) {
  return (
    <CreateButton
      {...buttonProps}
      variant="bareIcon"
      type="button"
      className={[
        'approval-overtime-action-button',
        'approval-overtime-action-button--approve',
        'user-permission-action-button',
        'parent-action-button',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={buttonProps['aria-label'] ?? title}
      title={title}
    >
      <CheckCircle size={24} aria-hidden="true" />
    </CreateButton>
  )
}

export default ButtonApprove
