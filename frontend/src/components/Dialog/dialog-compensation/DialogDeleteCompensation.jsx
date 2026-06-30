import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

function getCompensationTypeDisplayName(compensationType) {
  return (
    compensationType?.name ||
    compensationType?.code ||
    compensationType?.compensation_kind ||
    'compensation type ini'
  )
}

function getCompensationTypeId(compensationType) {
  return compensationType?.id ?? compensationType?.compensation_type_id ?? null
}

function DialogDeleteCompensation({
  isOpen = false,
  eyebrow = 'Delete Compensation Type',
  title = 'Delete Compensation Type',
  compensationType = null,
  compensationTypes = null,
  onClose,
  onDeleted,
  onConfirm,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const selectedCompensationType = compensationType ?? compensationTypes
  const displayName = useMemo(
    () => getCompensationTypeDisplayName(selectedCompensationType),
    [selectedCompensationType],
  )

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return
    }

    setErrorMessage('')
    onClose?.()
  }, [isSubmitting, onClose])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose, isOpen, isSubmitting])

  const handleDelete = async () => {
    const deleteId = getCompensationTypeId(selectedCompensationType)

    if (!deleteId) {
      setErrorMessage('ID compensation type tidak ditemukan.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await api.compensationTypes.remove(deleteId)
      onDeleted?.(selectedCompensationType)
      onConfirm?.(selectedCompensationType)
      onClose?.()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal menghapus compensation type.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-delete-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <p className="dashboard-popup__text">
            Apakah Anda yakin ingin menghapus <strong>{displayName}</strong>?
          </p>
          <p className="dashboard-popup__text">
            Tindakan ini akan menghapus data compensation type dari master compensation types.
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
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--danger"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogDeleteCompensation
