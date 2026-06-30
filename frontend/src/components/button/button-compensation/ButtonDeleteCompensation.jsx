import CreateButton from '../CreateButton.jsx'
import { Trash03 } from '../../template/TemplateIcons.jsx'

function ButtonDeleteCompensation({ className = '', title = 'Delete', ...buttonProps }) {
  return (
    <CreateButton
      {...buttonProps}
      variant="bareIcon"
      type="button"
      tone="danger"
      className={['user-permission-action-button parent-action-button parent-action-button--delete', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={buttonProps['aria-label'] ?? title}
      title={title}
    >
      <Trash03 size={20} aria-hidden="true" />
    </CreateButton>
  )
}

export default ButtonDeleteCompensation

