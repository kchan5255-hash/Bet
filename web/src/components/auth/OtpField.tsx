"use client";

import { useEffect, useRef, useState } from "react";

export function OtpField({
  name = "token",
  length = 6,
  defaultValue = "",
  autoFocus = true,
}: {
  name?: string;
  length?: number;
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(() => {
    const arr = Array.from({ length }, () => "");
    for (let i = 0; i < Math.min(defaultValue.length, length); i++) {
      const ch = defaultValue[i];
      if (/\d/.test(ch)) arr[i] = ch;
    }
    return arr;
  });
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function setAt(idx: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function fill(values: string[]) {
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < length; i++) {
        next[i] = values[i] ?? "";
      }
      return next;
    });
  }

  function focus(idx: number) {
    const el = refs.current[idx];
    if (el) {
      el.focus();
      el.select();
    }
  }

  function onChange(idx: number, raw: string) {
    const ch = raw.replace(/\D/g, "").slice(-1);
    setAt(idx, ch);
    if (ch && idx < length - 1) focus(idx + 1);
  }

  function onKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        setAt(idx, "");
      } else if (idx > 0) {
        focus(idx - 1);
        setAt(idx - 1, "");
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      focus(idx - 1);
      e.preventDefault();
    }
    if (e.key === "ArrowRight" && idx < length - 1) {
      focus(idx + 1);
      e.preventDefault();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const arr = text.slice(0, length).split("");
    fill(arr);
    const nextIdx = Math.min(arr.length, length - 1);
    focus(nextIdx);
  }

  return (
    <div className="block">
      <span className="text-xs text-text-muted">驗證碼</span>
      <div className="mt-1 flex items-center justify-between gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={d}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
            className="number-mono h-12 w-12 rounded-lg border border-border bg-bg-subtle text-center text-lg font-bold outline-none focus:border-text-muted"
            aria-label={`驗證碼第 ${i + 1} 位`}
          />
        ))}
      </div>
      <input type="hidden" name={name} value={digits.join("")} />
      <span className="mt-2 block text-[11px] text-text-subtle">
        從 Email 中複製 6 位數字直接貼上即可
      </span>
    </div>
  );
}
