import { useEffect, useRef, useState } from 'react'

import DialogCreateBulkReqOvertime from '../../Dialog/dialog-req-overtime/DialogCreateBulkReqOvertime.jsx'
import DialogCreateReqOvertime from '../../Dialog/dialog-req-overtime/DialogCreateReqOvertime.jsx'
import { ChevronDown, FileText01 } from '../../template/TemplateIcons.jsx'

function ButtonCreateReqOvertime({
  className = '',
  children = 'Req Overtime',
  bulkChildren = 'Bulk Req Overtime',
  bulkDialogProps = {},
  dialogProps = {},
  disabled = false,
  iconSize = 18,
  onClick,
  onCreated,
  type = 'button',
  ...buttonProps
}) {
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isReqDialogOpen, setIsReqDialogOpen] = useState(false)
  const splitButtonRef = useRef(null)

  const buttonClassName = ['request-overtime-split-button', className].filter(Boolean).join(' ')

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const handleDocumentPointerDown = (event) => {
      if (splitButtonRef.current?.contains(event.target)) {
        return
      }

      setIsMenuOpen(false)
    }

    const handleDocumentKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentPointerDown)
    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown)
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [isMenuOpen])

  const handleOpenReqDialog = (event) => {
    onClick?.(event)

    if (!event.defaultPrevented) {
      setIsMenuOpen(false)
      setIsReqDialogOpen(true)
    }
  }

  const handleOpenBulkDialog = () => {
    setIsMenuOpen(false)
    setIsBulkDialogOpen(true)
  }

  const handleCloseReqDialog = () => {
    dialogProps.onClose?.()
    setIsReqDialogOpen(false)
  }

  const handleCloseBulkDialog = () => {
    bulkDialogProps.onClose?.()
    setIsBulkDialogOpen(false)
  }

  const handleReqCreated = (createdReqOvertime) => {
    dialogProps.onCreated?.(createdReqOvertime)
    onCreated?.(createdReqOvertime)
  }

  const handleBulkCreated = (createdBulkOvertime) => {
    bulkDialogProps.onCreated?.(createdBulkOvertime)
    onCreated?.(createdBulkOvertime)
  }

  return (
    <>
      <div
        ref={splitButtonRef}
        className={buttonClassName}
        aria-label="Create request overtime"
      >
        <button
          {...buttonProps}
          type={type}
          className="users-table-card__action request-overtime-split-button__main"
          onClick={handleOpenReqDialog}
          aria-expanded={isReqDialogOpen}
          disabled={disabled}
        >
          <FileText01 size={iconSize} aria-hidden="true" />
          <span>{children}</span>
        </button>

        <button
          type={type}
          className="users-table-card__action request-overtime-split-button__toggle"
          onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          aria-label="Choose request overtime type"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          disabled={disabled}
        >
          <ChevronDown
            size={iconSize}
            className={`request-overtime-split-button__chevron${isMenuOpen ? ' open' : ''}`}
            aria-hidden="true"
          />
        </button>

        {isMenuOpen ? (
          <div className="request-overtime-split-button__menu" role="menu">
            <button
              type="button"
              className="request-overtime-split-button__option"
              onClick={handleOpenReqDialog}
              role="menuitem"
            >
              <FileText01 size={iconSize} aria-hidden="true" />
              <span>{children}</span>
            </button>
            <button
              type="button"
              className="request-overtime-split-button__option"
              onClick={handleOpenBulkDialog}
              role="menuitem"
            >
              <FileText01 size={iconSize} aria-hidden="true" />
              <span>{bulkChildren}</span>
            </button>
          </div>
        ) : null}
      </div>

      <DialogCreateReqOvertime
        {...dialogProps}
        isOpen={isReqDialogOpen}
        onClose={handleCloseReqDialog}
        onCreated={handleReqCreated}
      />

      <DialogCreateBulkReqOvertime
        {...bulkDialogProps}
        isOpen={isBulkDialogOpen}
        onClose={handleCloseBulkDialog}
        onCreated={handleBulkCreated}
      />
    </>
  )
}

export default ButtonCreateReqOvertime
