import type { LabelHTMLAttributes, ReactNode } from "react";

type Props = LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
  children: ReactNode;
};

export default function FieldLabel({ required, children, className, ...rest }: Props) {
  return (
    <label className={className} {...rest}>
      {children}
      {required && (
        <>
          <span className="text-red-500 ml-0.5" aria-hidden>*</span>
          <span className="sr-only">（必須）</span>
        </>
      )}
    </label>
  );
}
