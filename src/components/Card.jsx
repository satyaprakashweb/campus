/**
 * Reusable Card container with warm beige styling and optional hover lift.
 */
export default function Card({
  children,
  hover = false,
  compact = false,
  sand = false,
  as: Component = 'div',
  className = '',
  ...props
}) {
  const classes = [
    'card',
    hover ? 'card--hover' : '',
    compact ? 'card--compact' : '',
    sand ? 'card--sand' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}
