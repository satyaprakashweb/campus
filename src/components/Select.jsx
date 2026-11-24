/**
 * Controlled Select field with visible label and accessible validation message.
 */
export default function Select({
  id,
  label,
  required = false,
  error,
  hint,
  options = [],
  placeholder,
  className = '',
  children,
  ...props
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={`form-group ${className}`.trim()}>
      {label && (
        <label
          htmlFor={id}
          className={`form-label ${required ? 'form-label--required' : ''}`}
        >
          {label}
        </label>
      )}

      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`form-select ${error ? 'form-select--error' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ) : (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        )}
        {children}
      </select>

      {error && (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}
