import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import { createRoot } from "gnim"

type ConfirmDialogProps = {
  window: Adw.Window
  heading: string
  body?: string
  confirmText: string
  type?: "destructive" | "suggested" | "default"
  onConfirm: () => void
  onCancel?: () => void
}

const CANCEL = "cancel"
const CONFIRM = "confirm"

export default function ConfirmDialog({
  window,
  heading,
  body,
  confirmText,
  type = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  function init(self: Adw.AlertDialog) {
    self.add_response(CANCEL, _("Cancel"))
    self.add_response(CONFIRM, confirmText)
    self.set_response_appearance(CONFIRM, Adw.ResponseAppearance[type.toUpperCase()])
    self.present(window)
  }

  return createRoot((dispose) => (
    <Adw.AlertDialog
      $={init}
      onResponse={(_, res) => {
        if (res === CANCEL) onCancel?.()
        if (res === CONFIRM) onConfirm()
        dispose()
      }}
      closeResponse={CANCEL}
      heading={heading}
      body={body}
      {...(type !== "destructive" && {
        defaultResponse: CONFIRM,
      })}
    />
  ))
}
