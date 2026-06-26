import { useState } from 'react'

import DialogCreateReqOvertime from '../../Dialog/dialog-req-overtime/DialogCreateReqOvertime.jsx'
import { FileText01 } from '../../template/TemplateIcons.jsx'

function ButtonCreateReqOvertime({
  className = '',
  children = 'Create Req Overtime',
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

  const handleCreated = (createdReqOvertime) => {
    dialogProps.onCreated?.(createdReqOvertime)
    onCreated?.(createdReqOvertime)
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

      <DialogCreateReqOvertime
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onCreated={handleCreated}
      />
    </>
  )
}

export default ButtonCreateReqOvertime
