import Link from "next/link";
import styles from "./Button.module.css";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  disabled,
}: ButtonProps) {
  const className = `${styles.button} ${variant === "ghost" ? styles.ghost : styles.primary}`;
  if (href) {
    const external = href.startsWith("http");
    if (external) {
      return (
        <a className={className} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }
  return (
    <button className={className} type={type} disabled={disabled}>
      {children}
    </button>
  );
}
