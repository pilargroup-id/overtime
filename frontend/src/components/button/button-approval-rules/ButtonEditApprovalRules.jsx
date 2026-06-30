import CreateButton from '../CreateButton.jsx'
import { Edit03 } from '../../template/TemplateIcons.jsx'

function ButtonEditCompensation({ className = '', title = 'Edit', ...buttonProps }) {
  return (
    <CreateButton
      {...buttonProps}
      variant="bareIcon"
      type="button"
      className={['user-permission-action-button parent-action-button parent-action-button--edit', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={buttonProps['aria-label'] ?? title}
      title={title}
    >
      <Edit03 size={20} aria-hidden="true" />
    </CreateButton>
  )
}

export default ButtonEditCompensation
