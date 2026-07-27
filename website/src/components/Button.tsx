import Link from "next/link";
import styles from "./Button.module.css";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
};

/**
 * The one button on this site: a 1px accent outline on transparent, never
 * filled. The label is --color-accent-700 rather than the accent itself,
 * which is only 3.0:1 on the ground and would fail at this size.
 */
export function Button({ children, href, type = "button", disabled }: ButtonProps) {
  if (href) {
    const external = href.startsWith("http");
    if (external) {
      return (
        <a
          className={styles.button}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    }
    return (
      <Link className={styles.button} href={href}>
        {children}
      </Link>
    );
  }
  return (
    <button className={styles.button} type={type} disabled={disabled}>
      {children}
    </button>
  );
}
