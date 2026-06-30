import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

const initialFormValues = {
  code: '',
  name: '',
  compensation_kind: 'MONEY',
  amount: '',
  leave_days: '',
  description: '',
  is_active: '1',
}

const COMPENSATION_KIND_OPTIONS = ['MONEY', 'LEAVE']
const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
]

function toRequiredNumber(value) {
  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : null
}

function getCompensationTypeId(compensationType) {
  return compensationType?.id ?? compensationType?.compensation_type_id ?? null
}

function createFormValuesFromCompensationType(compensationType) {
  if (!compensationType) {
    return initialFormValues
  }

  return {
    code: String(compensationType.code ?? ''),
    name: String(compensationType.name ?? ''),
    compensation_kind: compensationType.compensation_kind ?? 'MONEY',
    amount:
      compensationType.amount === undefined || compensationType.amount === null
        ? ''
        : String(compensationType.amount),
    leave_days:
      compensationType.leave_days === undefined || compensationType.leave_days === null
        ? ''
        : String(compensationType.leave_days),
    description: String(compensationType.description ?? ''),
    is_active: String(Number(compensationType.is_active ?? 1)),
  }
}

function DialogEditCompensation({
  isOpen = false,
  eyebrow = 'Edit Compensation Type',
  title = 'Edit Compensation Type',
  compensationType = null,
  compensationTypes = null,
  onClose,
  onEdited,
}) {
  const selectedCompensationType = compensationType ?? compensationTypes
  const [formValues, setFormValues] = useState(() =>
    createFormValuesFromCompensationType(selectedCompensationType),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(createFormValuesFromCompensationType(selectedCompensationType))
    setIsSubmitting(false)
    setErrorMessage('')
  }, [selectedCompensationType])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    setFormValues(createFormValuesFromCompensationType(selectedCompensationType))
  }, [selectedCompensationType])

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

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const buildPayload = () => {
    const isMoney = formValues.compensation_kind === 'MONEY'
    const amount = isMoney ? toRequiredNumber(formValues.amount) : null
    const leaveDays = isMoney ? null : toRequiredNumber(formValues.leave_days)
    const description = formValues.description.trim()

    return {
      code: formValues.code.trim(),
      name: formValues.name.trim(),
      compensation_kind: formValues.compensation_kind,
      amount,
      leave_days: leaveDays,
      description: description || null,
      is_active: Number(formValues.is_active),
    }
  }

  const validatePayload = (payload) => {
    if (!payload.code) {
      return 'Code wajib diisi.'
    }

    if (!payload.name) {
      return 'Name wajib diisi.'
    }

    if (!COMPENSATION_KIND_OPTIONS.includes(payload.compensation_kind)) {
      return 'Compensation kind tidak valid.'
    }

    if (payload.compensation_kind === 'MONEY' && (!payload.amount || payload.amount <= 0)) {
      return 'Amount wajib diisi dengan angka lebih dari 0 untuk MONEY.'
    }

    if (
      payload.compensation_kind === 'LEAVE' &&
      (!payload.leave_days || payload.leave_days <= 0)
    ) {
      return 'Leave days wajib diisi dengan angka lebih dari 0 untuk LEAVE.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const compensationTypeId = getCompensationTypeId(selectedCompensationType)

    if (!compensationTypeId) {
      setErrorMessage('ID compensation type tidak ditemukan.')
      return
    }

    const payload = buildPayload()
    const validationMessage = validatePayload(payload)

    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedCompensationType = await api.compensationTypes.update(
        compensationTypeId,
        payload,
      )

      onEdited?.(editedCompensationType, payload)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengubah compensation type.')
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

  const isMoney = formValues.compensation_kind === 'MONEY'

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={isSubmitting ? undefined : handleClose}
    >
      <form
        className="dashboard-popup register-user-popup mtickets-create-popup parent-create-popup overtime-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-compensation-type-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-compensation-type-title">
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
          <div className="register-user-popup__layout">
            <div className="register-user-popup__main">
              <div className="register-user-popup__form">
                <div className="register-user-popup__grid">
                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-compensation-code"
                    >
                      Code
                    </label>
                    <input
                      id="edit-compensation-code"
                      name="code"
                      type="text"
                      className="register-user-popup__input"
                      value={formValues.code}
                      onChange={handleInputChange}
                      placeholder="MONEY_100K"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-compensation-name"
                    >
                      Name
                    </label>
                    <input
                      id="edit-compensation-name"
                      name="name"
                      type="text"
                      className="register-user-popup__input"
                      value={formValues.name}
                      onChange={handleInputChange}
                      placeholder="Uang Lembur 100.000"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-compensation-kind"
                    >
                      Compensation Kind
                    </label>
                    <select
                      id="edit-compensation-kind"
                      name="compensation_kind"
                      className="register-user-popup__select"
                      value={formValues.compensation_kind}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    >
                      {COMPENSATION_KIND_OPTIONS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                    <p className="register-user-popup__hint">
                      MONEY memakai amount, LEAVE memakai leave days.
                    </p>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-compensation-status"
                    >
                      Status
                    </label>
                    <select
                      id="edit-compensation-status"
                      name="is_active"
                      className="register-user-popup__select"
                      value={formValues.is_active}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-compensation-amount"
                    >
                      Amount
                    </label>
                    <input
                      id="edit-compensation-amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="1"
                      className="register-user-popup__input"
                      value={formValues.amount}
                      onChange={handleInputChange}
                      placeholder="100000"
                      disabled={isSubmitting || !isMoney}
                    />
                    <p className="register-user-popup__hint">
                      Diisi hanya untuk compensation kind MONEY.
                    </p>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-compensation-leave-days"
                    >
                      Leave Days
                    </label>
                    <input
                      id="edit-compensation-leave-days"
                      name="leave_days"
                      type="number"
                      min="0"
                      step="0.5"
                      className="register-user-popup__input"
                      value={formValues.leave_days}
                      onChange={handleInputChange}
                      placeholder="0.5"
                      disabled={isSubmitting || isMoney}
                    />
                    <p className="register-user-popup__hint">
                      Diisi hanya untuk compensation kind LEAVE.
                    </p>
                  </div>

                  <div className="register-user-popup__field register-user-popup__field--full">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-compensation-description"
                    >
                      Description
                    </label>
                    <textarea
                      id="edit-compensation-description"
                      name="description"
                      className="register-user-popup__input master-project-popup__textarea"
                      value={formValues.description}
                      onChange={handleInputChange}
                      placeholder="Kompensasi uang lembur sebesar 100.000"
                      rows={4}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {errorMessage ? (
                  <p className="register-user-popup__hint" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
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
            type="submit"
            className="dashboard-popup__button dashboard-popup__button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditCompensation
