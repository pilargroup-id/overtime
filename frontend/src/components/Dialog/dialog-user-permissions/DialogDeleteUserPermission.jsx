import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

function getUserPermissionDisplayName(userPermission) {
  return (
    userPermission?.user_name ||
    userPermission?.username ||
    userPermission?.name ||
    userPermission?.user_id ||
    userPermission?.permission_type ||
    'permission ini'
  )
}

function getUserPermissionId(userPermission) {
  return userPermission?.id ?? userPermission?.user_permission_id ?? null
}

function DialogDeleteUserPermission({
  isOpen = false,
  eyebrow = 'Delete User Permission',
  title = 'Delete User Permission',
  userPermission = null,
  onClose,
  onDeleted,
  onConfirm,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const displayName = useMemo(
    () => getUserPermissionDisplayName(userPermission),
    [userPermission],
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
    const deleteId = getUserPermissionId(userPermission)

    if (!deleteId) {
      setErrorMessage('ID user permission tidak ditemukan.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await api.userPermissions.remove(deleteId)
      onDeleted?.(userPermission)
      onConfirm?.(userPermission)
      onClose?.()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal menghapus user permission.')
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
            Tindakan ini akan menghapus data user permission dari master user permissions.
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

export default DialogDeleteUserPermission
