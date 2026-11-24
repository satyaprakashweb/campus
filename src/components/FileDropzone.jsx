import { useRef, useState } from 'react';
import { Upload, X, RefreshCw, Image as ImageIcon, Sparkles, Plus } from 'lucide-react';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_EXT_REGEX = /\.(jpe?g|png|webp)$/i;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Client-side image optimizer: resizes large images (> 1280px) cleanly via Canvas
 * while preserving aspect ratio and format so CLIP visual embedding extraction is fast and reliable.
 */
function readAndOptimizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read file "${file.name}".`));
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size <= 1.5 * 1024 * 1024) {
          resolve({
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            sizeBytes: file.size,
            width,
            height,
            previewUrl: dataUrl,
          });
          return;
        }
        const scale = Math.min(maxDim / width, maxDim / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            sizeBytes: file.size,
            width: img.width,
            height: img.height,
            previewUrl: dataUrl,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const optimizedUrl = canvas.toDataURL(outType, 0.88);
        resolve({
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          sizeBytes: file.size,
          width,
          height,
          previewUrl: optimizedUrl,
        });
      };
      img.onerror = () => {
        // Still pass dataUrl if image decode in headless canvas isn't triggered
        resolve({
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          sizeBytes: file.size,
          width: 800,
          height: 600,
          previewUrl: dataUrl,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Accessible drag-and-drop FileDropzone supporting both single-image (`multiple=false`)
 * and multi-image gallery (`multiple=true`) modes with preview, remove, and replace.
 */
export default function FileDropzone({
  id = 'photo-upload',
  label = 'Item Photographs (CLIP AI Visual Matching)',
  hint = 'JPG, JPEG, PNG, or WEBP up to 5 MB each. Upload clear photos from multiple angles for CLIP image similarity matching.',
  value,
  onChange,
  multiple = false,
  maxFiles = 4,
}) {
  const inputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const [replaceIndex, setReplaceIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  // Normalize current value into an array of photo objects: [{ name, previewUrl, ... }]
  const itemsList = (() => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((v, i) =>
          typeof v === 'string'
            ? { id: `existing-${i}`, name: `Photo ${i + 1}`, previewUrl: v }
            : v
        )
        .filter((v) => Boolean(v?.previewUrl));
    }
    if (typeof value === 'string') {
      return [{ id: 'existing-0', name: 'Uploaded photo', previewUrl: value }];
    }
    if (value?.previewUrl) {
      return [value];
    }
    return [];
  })();

  const emitChange = (nextList) => {
    if (multiple) {
      onChange(nextList);
    } else {
      onChange(nextList[0] || null);
    }
  };

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    const validType = ALLOWED_TYPES.has(file.type.toLowerCase()) || ALLOWED_EXT_REGEX.test(file.name || '');
    if (!validType) {
      return `"${file.name}" is not a supported format. Please upload JPG, JPEG, PNG, or WEBP images.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `"${file.name}" exceeds the 5 MB maximum image size limit.`;
    }
    return '';
  };

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    for (const f of files) {
      const validationError = validateFile(f);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setError('');
    try {
      const processed = [];
      for (const f of files) {
        const item = await readAndOptimizeImageFile(f);
        processed.push(item);
      }

      if (multiple) {
        const combined = [...itemsList, ...processed].slice(0, maxFiles);
        emitChange(combined);
      } else {
        emitChange([processed[0]]);
      }
    } catch (err) {
      setError(err.message || 'Could not process the selected image.');
    }
  };

  const handleReplaceFile = async (file) => {
    if (!file || replaceIndex === null) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    try {
      const replacement = await readAndOptimizeImageFile(file);
      const nextList = itemsList.map((item, idx) => (idx === replaceIndex ? replacement : item));
      emitChange(nextList);
    } catch (err) {
      setError(err.message || 'Could not replace image.');
    } finally {
      setReplaceIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleRemoveIndex = (idxToRemove) => {
    const nextList = itemsList.filter((_, idx) => idx !== idxToRemove);
    emitChange(nextList);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleMakePrimary = (idxToPromote) => {
    if (idxToPromote <= 0 || idxToPromote >= itemsList.length) return;
    const target = itemsList[idxToPromote];
    const rest = itemsList.filter((_, idx) => idx !== idxToPromote);
    emitChange([target, ...rest]);
  };

  return (
    <div className="form-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
        <label htmlFor={id} className="form-label" style={{ marginBottom: 0 }}>
          {label}
        </label>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--bronze-700)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <Sparkles size={13} aria-hidden="true" />
          {multiple
            ? `${itemsList.length} / ${maxFiles} photos · CLIP ViT-B/32 Ready`
            : 'CLIP ViT-B/32 Visual Verification'}
        </span>
      </div>

      {/* Hidden file input for Replace action */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="sr-only"
        aria-label="Replace photograph"
        onChange={(e) => handleReplaceFile(e.target.files?.[0])}
      />

      {/* Uploaded Previews Gallery */}
      {itemsList.length > 0 && (
        <div
          className="dropzone-gallery"
          style={{
            display: 'grid',
            gridTemplateColumns: multiple
              ? 'repeat(auto-fill, minmax(210px, 1fr))'
              : '1fr',
            gap: '0.85rem',
            marginBottom: !multiple || itemsList.length >= maxFiles ? 0 : '0.85rem',
          }}
        >
          {itemsList.map((imgItem, idx) => (
            <div
              key={imgItem.id || `${imgItem.name}-${idx}`}
              style={{
                position: 'relative',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: idx === 0 ? '1.5px solid var(--bronze-500)' : '1px solid var(--sand-300)',
                backgroundColor: 'var(--cream-50)',
                padding: '0.65rem',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--sand-200)' }}>
                <img
                  src={imgItem.previewUrl}
                  alt={`Uploaded preview ${idx + 1}: ${imgItem.name}`}
                  className="dropzone__preview"
                  style={{
                    width: '100%',
                    height: multiple ? '155px' : '220px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '0.45rem',
                    left: '0.45rem',
                    padding: '0.18rem 0.55rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    backgroundColor: idx === 0 ? 'rgba(61, 48, 38, 0.88)' : 'rgba(255, 253, 248, 0.92)',
                    color: idx === 0 ? 'var(--cream-50)' : 'var(--mocha-900)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {idx === 0 ? 'Primary Photo · CLIP' : `Photo #${idx + 1}`}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.55rem',
                  gap: '0.4rem',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--mocha-600)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    maxWidth: '140px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={imgItem.name}
                >
                  <ImageIcon size={13} aria-hidden="true" /> {imgItem.name || `Image ${idx + 1}`}
                </span>

                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {multiple && idx > 0 && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                      onClick={() => handleMakePrimary(idx)}
                      title="Set as primary matching photograph"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                    onClick={() => {
                      setReplaceIndex(idx);
                      replaceInputRef.current?.click();
                    }}
                  >
                    <RefreshCw size={12} aria-hidden="true" /> Replace
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', color: 'var(--danger)' }}
                    onClick={() => handleRemoveIndex(idx)}
                  >
                    <X size={13} aria-hidden="true" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drag-and-drop Upload Zone (shown when empty or when multiple & under maxFiles) */}
      {(itemsList.length === 0 || (multiple && itemsList.length < maxFiles)) && (
        <div
          className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Upload item photograph"
          style={{
            padding: itemsList.length > 0 ? '1.1rem' : undefined,
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            id={id}
            type="file"
            multiple={multiple}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div style={{ color: 'var(--bronze-700)', marginBottom: '0.4rem' }} aria-hidden="true">
            {itemsList.length > 0 ? (
              <Plus size={24} style={{ margin: '0 auto' }} />
            ) : (
              <Upload size={26} style={{ margin: '0 auto' }} />
            )}
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--mocha-900)', marginBottom: '0.2rem' }}>
            <strong style={{ color: 'var(--bronze-700)' }}>
              {itemsList.length > 0 ? 'Add another photograph' : 'Click to upload'}
            </strong>{' '}
            or drag and drop {multiple ? 'photographs' : 'a photo'} here
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>{hint}</p>
        </div>
      )}

      {error && (
        <p className="form-error" role="alert" style={{ marginTop: '0.45rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
