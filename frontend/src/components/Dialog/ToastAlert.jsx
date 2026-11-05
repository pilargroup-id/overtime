import { Alert, AlertTitle, Snackbar } from '@mui/material'

const DEFAULT_TITLES = {
  error: 'Terjadi Kesalahan',
  warning: 'Peringatan',
  success: 'Berhasil',
  info: 'Informasi',
}

function ToastAlert({
  open = false,
  onClose,
  title,
  message,
  severity = 'error',
  autoHideDuration = 8000,
}) {
  const handleClose = (_event, reason) => {
    if (reason === 'clickaway') {
      return
    }

    onClose?.()
  }

  return (
    <Snackbar
      open={open && Boolean(message)}
      onClose={handleClose}
      autoHideDuration={autoHideDuration}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ zIndex: 1400, top: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 } }}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        elevation={6}
        sx={{ width: '100%', minWidth: 320, maxWidth: 420, alignItems: 'flex-start', whiteSpace: 'pre-line' }}
      >
        <AlertTitle sx={{ mb: message ? 0.5 : 0 }}>
          {title || DEFAULT_TITLES[severity] || DEFAULT_TITLES.error}
        </AlertTitle>
        {message}
      </Alert>
    </Snackbar>
  )
}

export default ToastAlert
