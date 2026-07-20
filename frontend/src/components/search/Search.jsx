import { SearchMd, XClose } from '../template/TemplateIcons.jsx'

function Search({
  ariaLabel = 'Search request overtime',
  className = '',
  onChange,
  placeholder = 'Search request...',
  value = '',
}) {
  const searchValue = String(value ?? '')
  const hasValue = searchValue.length > 0
  const searchClassName = ['request-search', className].filter(Boolean).join(' ')

  const handleChange = (event) => {
    onChange?.(event.target.value, event)
  }

  const handleClear = () => {
    onChange?.('')
  }

  return (
    <div className={searchClassName}>
      <SearchMd size={18} className="request-search__icon" aria-hidden="true" />
      <input
        type="search"
        className="request-search__input"
        value={searchValue}
        placeholder={placeholder}
        onChange={handleChange}
        aria-label={ariaLabel}
        autoComplete="off"
      />

      {hasValue ? (
        <button
          type="button"
          className="request-search__clear"
          onClick={handleClear}
          aria-label="Clear search"
          title="Clear search"
        >
          <XClose size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

export default Search
