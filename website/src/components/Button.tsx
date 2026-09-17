import Link from "next/link";
import styles from "./Button.module.css";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  /** "primary" is the page's one real action: Get Pro. */
  variant?: "default" | "primary";
};

/**
 * The one button on this site: a 1px accent outline on transparent, never
 * filled. The label is --color-accent-700 rather than the accent itself,
 * which is only 3.0:1 on the ground and would fail at this size.
 */
export function Button({
  children,
  href,
  type = "button",
  disabled,
  onClick,
  variant = "default",
}: ButtonProps) {
  const className = [styles.button, variant === "primary" ? styles.primary : ""]
    .filter(Boolean)
    .join(" ");

  if (href) {
    const external = href.startsWith("http");
    if (external) {
      return (
        <a
          className={className}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
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
    <button className={className} type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
