# Gnome Eval

> [!CAUTION]
>
> ## Potential security breach
>
> This extension enables arbitrary code execution via `Eval()` D-Bus method.

Example:

- Running modules

  ```ts
  // notify.ts
  import { notify } from "resource:///org/gnome/shell/ui/main.js"
  notify("Hello There")
  ```

  ```sh
  gnome-eval $(pwd)/notify.ts
  ```

- Evaluating expressions

  ```sh
  gnome-eval 'import("resource:///org/gnome/shell/ui/main.js").then(m => m.notify("Hello There"))'
  ```
