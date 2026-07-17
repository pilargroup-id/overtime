import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { XClose } from '../../template/TemplateIcons.jsx'

function formatValue(value, fallback = '-') {
  const displayValue = String(value ?? '').trim()

  return displayValue || fallback
}

function DialogValidationApproveRO({
  isOpen = false,
  request = null,
  action = 'approve',
  selectedCount = 0,
  isSubmitting = false,
  errorMessage = '',
  onClose,
  onConfirm,
}) {
  const [note, setNote] = useState('')
  const [noteErrorMessage, setNoteErrorMessage] = useState('')
  const isReject = action === 'reject'
  const isBulkAction = Number(selectedCount) > 1
  const actionLabel = isReject ? 'Reject' : 'Approve'
  const statusLabel = isReject ? 'rejected' : 'approved'
  const dialogTitleId = 'dialog-validation-approval-ro-title'

  useEffect(() => {
    if (isOpen) {
      setNote('')
      setNoteErrorMessage('')
    }
  }, [action, isOpen, request])

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

  const handleConfirm = () => {
    const trimmedNote = note.trim()

    if (!trimmedNote) {
      setNoteErrorMessage('Note wajib diisi sebelum melanjutkan approval.')
      return
    }

    setNoteErrorMessage('')
    onConfirm?.(trimmedNote)
  }

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const requestNumber = formatValue(request?.request_number, 'request ini')
  const employeeName = formatValue(request?.employee_name_snapshot)
  const targetLabel = isBulkAction ? `${selectedCount} request overtime` : requestNumber

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
        aria-labelledby={dialogTitleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{actionLabel} Request</p>
            <h2 className="dashboard-popup__title" id={dialogTitleId}>
              {actionLabel} Request Overtime
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
            Apakah Anda yakin ingin {isReject ? 'menolak' : 'menyetujui'}{' '}
            <strong>{targetLabel}</strong>?
          </p>
          {isBulkAction ? (
            <p className="dashboard-popup__text">
              Semua request terpilih akan berubah menjadi status {statusLabel}.
            </p>
          ) : (
            <p className="dashboard-popup__text">
              Request milik <strong>{employeeName}</strong> akan berubah menjadi status{' '}
              {statusLabel}.
            </p>
          )}
          <label className="register-user-popup__field register-user-popup__field--full">
            <span className="register-user-popup__label">Note</span>
            <textarea
              className="register-user-popup__input master-project-popup__textarea"
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setNoteErrorMessage('')
              }}
              placeholder={
                isReject
                  ? 'Contoh: Lembur ditolak karena jadwal belum sesuai'
                  : 'Contoh: Lembur disetujui karena pekerjaan urgent'
              }
              rows={4}
              disabled={isSubmitting}
              required
            />
          </label>
          {noteErrorMessage ? (
            <p className="register-user-popup__hint" role="alert">
              {noteErrorMessage}
            </p>
          ) : null}
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
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Memproses...' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogValidationApproveRO
