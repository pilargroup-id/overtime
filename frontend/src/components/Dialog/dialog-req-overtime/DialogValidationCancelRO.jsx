import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { XClose } from '../../template/TemplateIcons.jsx'

function formatValue(value, fallback = '-') {
  const displayValue = String(value ?? '').trim()

  return displayValue || fallback
}

function DialogValidationCancelRO({
  isOpen = false,
  request = null,
  isSubmitting = false,
  errorMessage = '',
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const requestNumber = formatValue(request?.request_number, 'request ini')
  const employeeName = formatValue(request?.employee_name_snapshot)

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-validation-cancel-ro-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Cancel Request</p>
            <h2 className="dashboard-popup__title" id="dialog-validation-cancel-ro-title">
              Batalkan Request Overtime
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <p className="dashboard-popup__text">
            Apakah Anda yakin ingin membatalkan <strong>{requestNumber}</strong>?
          </p>
          <p className="dashboard-popup__text">
            Request milik <strong>{employeeName}</strong> akan berubah menjadi status canceled.
          </p>
          {errorMessage ? (
            <p className="register-user-popup__hint" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--danger"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Membatalkan...' : 'Cancel Request'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogValidationCancelRO
