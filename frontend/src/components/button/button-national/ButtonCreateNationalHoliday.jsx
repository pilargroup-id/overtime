import { useState } from 'react'

import DialogCreateNationalHoliday from '../../Dialog/dialog-national/DialogCreateNationalHoliday.jsx'
import { FileText01 } from '../../template/TemplateIcons.jsx'

function ButtonCreateNationalHoliday({
  className = '',
  children = 'Create National Holiday',
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

  const handleCreated = (createdCompensationType, payload) => {
    dialogProps.onCreated?.(createdCompensationType, payload)
    onCreated?.(createdCompensationType, payload)
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

      <DialogCreateNationalHoliday
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onCreated={handleCreated}
      />
    </>
  )
}

export default ButtonCreateNationalHoliday
    