import { useState } from 'react'

import DialogCreateBulkReqOvertime from '../../Dialog/dialog-req-overtime/DialogCreateBulkReqOvertime.jsx'
import { FileText01 } from '../../template/TemplateIcons.jsx'

function ButtonCreateReport({
  className = '',
  children = '',
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

  const handleCreated = (createdBulkOvertime) => {
    dialogProps.onCreated?.(createdBulkOvertime)
    onCreated?.(createdBulkOvertime)
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

      <DialogCreateBulkReqOvertime
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onCreated={handleCreated}
      />
    </>
  )
}

export default ButtonCreateReport
