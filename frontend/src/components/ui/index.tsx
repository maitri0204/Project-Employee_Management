import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-black outline-none transition-colors focus:ring-2";

function fieldClass(hasError: boolean) {
  return hasError
    ? `${inputClass} border-red-400 focus:border-red-500 focus:ring-red-100`
    : `${inputClass} border-slate-200 focus:border-blue-500 focus:ring-blue-100`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export function Input({
  label,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-black">
        {label}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <input className={`${fieldClass(!!error)} ${className}`} {...props} />
      <FieldError message={error} />
    </div>
  );
}

export function Select({
  label,
  error,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-black">
        {label}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <select className={`${fieldClass(!!error)} ${className}`} {...props}>
        {children}
      </select>
      <FieldError message={error} />
    </div>
  );
}

export function Textarea({
  label,
  error,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-black">
        {label}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <textarea className={`${fieldClass(!!error)} ${className}`} {...props} />
      <FieldError message={error} />
    </div>
  );
}

export function FileInput({
  label,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-black">
        {label}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className={`block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 ${className}`}
        {...props}
      />
      <FieldError message={error} />
    </div>
  );
}

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function MultiFileInput({
  label,
  error,
  files,
  onChange,
  required,
  maxFiles = 10,
  accept = ".jpg,.jpeg,.png,.pdf",
}: {
  label: string;
  error?: string;
  files: File[];
  onChange: (files: File[]) => void;
  required?: boolean;
  maxFiles?: number;
  accept?: string;
}) {
  const handleSelect = (selected: FileList | null) => {
    if (!selected?.length) return;

    const incoming = Array.from(selected);
    const merged = [...files];

    for (const file of incoming) {
      if (merged.length >= maxFiles) break;
      if (!merged.some((existing) => fileKey(existing) === fileKey(file))) {
        merged.push(file);
      }
    }

    onChange(merged);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-black">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>

      <input
        type="file"
        accept={accept}
        multiple
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        onChange={(e) => {
          handleSelect(e.target.files);
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {files.map((file, index) => (
            <li
              key={`${fileKey(file)}-${index}`}
              className="flex items-center justify-between gap-2 text-sm text-black"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 text-xs font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1 text-xs text-slate-500">
        {files.length}/{maxFiles} file(s) selected. You can pick multiple at once or add more in
        separate steps.
      </p>
      <FieldError message={error} />
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "success" | "outline";
  size?: "sm" | "md";
}) {
  const variants = {
    primary:
      "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-200/60 hover:from-blue-700 hover:to-indigo-700 hover:shadow-md",
    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:shadow",
    outline:
      "border border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-100",
    danger:
      "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm shadow-red-200/60 hover:from-red-700 hover:to-rose-700 hover:shadow-md",
    success:
      "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-200/60 hover:from-emerald-700 hover:to-teal-700 hover:shadow-md",
  };

  const sizes = {
    sm: "rounded-lg px-3 py-1.5 text-xs",
    md: "rounded-xl px-4 py-2.5 text-sm",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variants = {
    default: "bg-blue-50 text-blue-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  };

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  accentClass = "text-black",
}: {
  label: string;
  value: string | number;
  accentClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-black">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accentClass}`}>{value}</p>
    </div>
  );
}
