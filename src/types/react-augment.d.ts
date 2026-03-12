// React 19 Type Compatibility Fix
// React 19 changed ReactNode to not accept Element[] directly.
// This declaration restores the previous behavior for JSX children type checking.
import "react";

declare module "react" {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    children?: ReactNode | ReactNode[];
  }
}
