import { InputProps } from '@/types';
import { cn } from '@/utils';

const Input = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  className,
  name,
  ...props
}: InputProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="form-group">
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className={cn(
          'form-input',
          error && 'error',
          className
        )}
        {...props}
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
};

export default Input;