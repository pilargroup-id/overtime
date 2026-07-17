function formatTimeInput(inputValue) {
  const cleanedValue = inputValue.replace(/[^\d:]/g, '')
  const [hour = '', minute = ''] = cleanedValue.split(':')
  const hourValue = hour.slice(0, 2)
  const minuteValue = minute.slice(0, 2)

  if (cleanedValue.includes(':')) {
    return `${hourValue}:${minuteValue}`
  }

  if (hourValue.length === 2 && cleanedValue.length > 2) {
    return `${hourValue}:${cleanedValue.slice(2, 4)}`
  }

  return hourValue
}

function normalizeTimeValue(inputValue) {
  if (!inputValue) {
    return ''
  }

  const [hour = '', minute = ''] = inputValue.split(':')
  const hourNumber = Number(hour)
  const minuteNumber = Number(minute || '0')

  if (
    !hour ||
    Number.isNaN(hourNumber) ||
    Number.isNaN(minuteNumber) ||
    hourNumber < 1 ||
    hourNumber > 24 ||
    minuteNumber < 0 ||
    minuteNumber > 59
  ) {
    return inputValue
  }

  return `${String(hourNumber).padStart(2, '0')}:${String(minuteNumber).padStart(2, '0')}`
}

function Time24HourInput({ id, name, value, onChange, disabled = false }) {
  const emitChange = (nextValue) => {
    onChange({
      target: {
        name,
        value: nextValue,
      },
    })
  }

  const handleInputChange = (event) => {
    emitChange(formatTimeInput(event.target.value))
  }

  const handleBlur = () => {
    emitChange(normalizeTimeValue(value))
  }

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      className="register-user-popup__input"
      value={value}
      placeholder="HH:MM"
      maxLength={5}
      pattern="(0?[1-9]|1[0-9]|2[0-4]):[0-5][0-9]"
      title="Gunakan format 24 jam, contoh 13:30"
      onChange={handleInputChange}
      onBlur={handleBlur}
      disabled={disabled}
    />
  )
}

export default Time24HourInput
