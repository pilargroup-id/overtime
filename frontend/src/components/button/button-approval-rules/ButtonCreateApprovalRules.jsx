import { useState } from 'react'

import DialogCreateApprovalRules from '../../Dialog/dialog-approval-rules/DialogCreateApprovalRules.jsx'
import { FileText01 } from '../../template/TemplateIcons.jsx'

function ButtonCreateApprovalRules({
  className = '',
  children = 'Create Approval Rules',
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

  const handleCreated = (createdApprovalRule, payload) => {
    dialogProps.onCreated?.(createdApprovalRule, payload)
    onCreated?.(createdApprovalRule, payload)
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

      <DialogCreateApprovalRules
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onCreated={handleCreated}
      />
    </>
  )
}

export default ButtonCreateApprovalRules
