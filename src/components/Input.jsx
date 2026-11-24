/**
 * Controlled Input / Textarea field with always-visible label, hint, and accessible error state.
 */
export default function Input({
  id,
  label,
  required = false,
  error,
  hint,
  multiline = false,
  maxLength,
  value = '',
  showCount = false,
  className = '',
  ...props
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

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

      {multiline ? (
        <textarea
          id={id}
          value={value}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`form-textarea ${error ? 'form-textarea--error' : ''}`}
          {...props}
        />
      ) : (
        <input
          id={id}
          value={value}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`form-input ${error ? 'form-input--error' : ''}`}
          {...props}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {error && (
            <p id={errorId} className="form-error" role="alert">
              {error}
            </p>
          )}
          {!error && hint && (
            <p id={hintId} className="form-hint">
              {hint}
            </p>
          )}
        </div>
        {showCount && maxLength && (
          <span className="char-count" aria-live="polite">
            {String(value).length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
