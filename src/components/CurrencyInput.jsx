/**
 * Input de moeda no formato Real Brasileiro (R$).
 * value: string de dígitos representando centavos (ex: "150000" = R$ 1.500,00)
 * onChange: recebe string de dígitos
 */
export default function CurrencyInput({ value, onChange, placeholder = '0,00', className, required, id, autoFocus }) {
  const displayValue = value
    ? (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    onChange(digits);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      autoFocus={autoFocus}
      className={className}
    />
  );
}

/** Converte string de dígitos (centavos) para float */
export const centsToFloat = (digits) => parseInt(digits || '0', 10) / 100;

/** Converte float para string de dígitos (centavos) */
export const floatToCents = (value) => String(Math.round((value || 0) * 100));
