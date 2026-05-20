"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function Field({
  id,
  name,
  type = "text",
  label,
  placeholder,
  icon,
  autoComplete,
  minLength,
  maxLength,
  required,
  defaultValue,
  inputMode,
  pattern,
  hint,
}: {
  id: string;
  name: string;
  type?: string;
  label: string;
  placeholder?: string;
  icon?: React.ReactNode;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  defaultValue?: string;
  inputMode?: "text" | "email" | "numeric";
  pattern?: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 focus-within:border-text-muted">
        {icon ? <span className="text-text-subtle">{icon}</span> : null}
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          required={required}
          defaultValue={defaultValue}
          inputMode={inputMode}
          pattern={pattern}
          className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-text-subtle"
        />
      </div>
      {hint ? (
        <span className="mt-1 block text-[11px] text-text-subtle">{hint}</span>
      ) : null}
    </label>
  );
}

export function PasswordField({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  minLength,
  required,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 focus-within:border-text-muted">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-text-subtle"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-text-subtle hover:text-text-muted"
          aria-label={show ? "隱藏密碼" : "顯示密碼"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint ? (
        <span className="mt-1 block text-[11px] text-text-subtle">{hint}</span>
      ) : null}
    </label>
  );
}
