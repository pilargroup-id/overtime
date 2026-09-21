import CreateButton from '../CreateButton.jsx'
import { Edit03 } from '../../template/TemplateIcons.jsx'

function ButtonEditReqOvertime({ className = '', title = 'Edit request', ...buttonProps }) {
  return (
    <CreateButton
      {...buttonProps}
      variant="bareIcon"
      type="button"
      className={[
        'req-overtime-action-button',
        'user-permission-action-button',
        'parent-action-button',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={buttonProps['aria-label'] ?? title}
      title={title}
    >
      <Edit03 size={20} aria-hidden="true" />
    </CreateButton>
  )
}

export default ButtonEditReqOvertime
