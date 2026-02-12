import type { SelectHTMLAttributes } from 'react'

interface SelectOption {
value: string | number
label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
label?: string
error?: string
options: SelectOption[]
placeholder?: string
}

export function Select({
label,
error,
options,
placeholder,
className = '',
...props
}: SelectProps) {
return (
<div className="flex flex-col gap-1.5">
{label && (
<label className="text-sm font-medium text-ink/80">
{label}
{props.required && <span className="ml-1 text-accent">*</span>}
</label>
)}
<select
className={`
rounded-xl border px-4 py-2.5 text-sm
${error ? 'border-red-400' : 'border-ink/10'}
focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20
bg-white
${className}
`}
{...props}
>
{placeholder && (
<option value="" disabled>
{placeholder}
</option>
)}
{options.map((option) => (
<option key={option.value} value={option.value}>
{option.label}
</option>
))}
</select>
{error && <span className="text-xs text-red-500">{error}</span>}
</div>
)
}