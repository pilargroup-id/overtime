import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

const initialFormValues = {
  holiday_date: '',
  name: '',
  multiplier: '2',
  description: '',
  is_active: '1',
}

const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
]

function toRequiredNumber(value) {
  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : null
}

function DialogCreateNationalHoliday({
  isOpen = false,
  eyebrow = 'Create National Holiday',
  title = 'Create National Holiday',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setIsSubmitting(false)
    setErrorMessage('')
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

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
    const multiplier = toRequiredNumber(formValues.multiplier)
    const description = formValues.description.trim()

    return {
      holiday_date: formValues.holiday_date,
      name: formValues.name.trim(),
      multiplier,
      description: description || null,
      is_active: Number(formValues.is_active),
    }
  }

  const validatePayload = (payload) => {
    if (!payload.holiday_date) {
      return 'Holiday date wajib diisi.'
    }

    if (!payload.name) {
      return 'Name wajib diisi.'
    }

    if (!payload.multiplier || payload.multiplier <= 0) {
      return 'Multiplier wajib diisi dengan angka lebih dari 0.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()
    const validationMessage = validatePayload(payload)

    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdNationalHoliday = await api.nationalHolidays.create(payload)

      onCreated?.(createdNationalHoliday, payload)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal membuat national holiday.')
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
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={isSubmitting ? undefined : handleClose}
    >
      <form
        className="dashboard-popup register-user-popup mtickets-create-popup parent-create-popup overtime-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-national-holiday-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-national-holiday-title">
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
                      htmlFor="create-national-holiday-date"
                    >
                      Holiday Date
                    </label>
                    <input
                      id="create-national-holiday-date"
                      name="holiday_date"
                      type="date"
                      className="register-user-popup__input"
                      value={formValues.holiday_date}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="create-national-holiday-name"
                    >
                      Name
                    </label>
                    <input
                      id="create-national-holiday-name"
                      name="name"
                      type="text"
                      className="register-user-popup__input"
                      value={formValues.name}
                      onChange={handleInputChange}
                      placeholder="Hari Kemerdekaan Republik Indonesia"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="create-national-holiday-multiplier"
                    >
                      Multiplier
                    </label>
                    <input
                      id="create-national-holiday-multiplier"
                      name="multiplier"
                      type="number"
                      min="0"
                      step="0.01"
                      className="register-user-popup__input"
                      value={formValues.multiplier}
                      onChange={handleInputChange}
                      placeholder="2"
                      disabled={isSubmitting}
                    />
                    <p className="register-user-popup__hint">
                      Angka lebih dari 0, misalnya 1.5, 2, atau 3.
                    </p>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="create-national-holiday-status"
                    >
                      Status
                    </label>
                    <select
                      id="create-national-holiday-status"
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

                  <div className="register-user-popup__field register-user-popup__field--full">
                    <label
                      className="register-user-popup__label"
                      htmlFor="create-national-holiday-description"
                    >
                      Description
                    </label>
                    <textarea
                      id="create-national-holiday-description"
                      name="description"
                      className="register-user-popup__input master-project-popup__textarea"
                      value={formValues.description}
                      onChange={handleInputChange}
                      placeholder="Libur nasional"
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

export default DialogCreateNationalHoliday
