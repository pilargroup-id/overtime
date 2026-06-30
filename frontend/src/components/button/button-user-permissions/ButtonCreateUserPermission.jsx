import { useState } from 'react'

import DialogCreateUserPermission from '../../Dialog/dialog-user-permissions/DialogCreateUserPermission.jsx'
import { FileText01 } from '../../template/TemplateIcons.jsx'

function ButtonCreateUserPermission({
  className = '',
  children = 'Create User Permission',
  dialogProps = {},
  iconSize = 18,
  onClick,
  onCreated,
  type = 'button',
  ...buttonProps
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const buttonClassName = ['users-table-card__action', className].filter(Boolean).join(' ')

  const handleOpenDialog = (event) => {
    onClick?.(event)

    if (!event.defaultPrevented) {
      setIsDialogOpen(true)
    }
  }

  const handleCloseDialog = () => {
    dialogProps.onClose?.()
    setIsDialogOpen(false)
  }

  const handleCreated = (createdUserPermission) => {
    dialogProps.onCreated?.(createdUserPermission)
    onCreated?.(createdUserPermission)
  }

  return (
    <>
      <button
        {...buttonProps}
        type={type}
        className={buttonClassName}
        onClick={handleOpenDialog}
        aria-expanded={isDialogOpen}
      >
        <FileText01 size={iconSize} aria-hidden="true" />
        <span>{children}</span>
      </button>

      <DialogCreateUserPermission
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onCreated={handleCreated}
      />
    </>
  )
}

export default ButtonCreateUserPermission
