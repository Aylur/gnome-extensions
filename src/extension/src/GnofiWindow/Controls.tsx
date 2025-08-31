import St from "gi://St"
import Clutter from "gi://Clutter"
import { useExtension } from "#/extenstion"
import { useGnofi } from "#/Gnofi"
import { createBinding } from "gnim"

export default function Controls() {
  const { gnofi } = useGnofi()
  const extension = useExtension()

  return (
    <St.BoxLayout class="gnofi-controls-box">
      <St.Button
        class="popup-menu-item"
        xExpand={false}
        xAlign={Clutter.ActorAlign.END}
        visible={createBinding(gnofi, "text").as(Boolean)}
        onClicked={() => (gnofi.text = "")}
      >
        <St.Icon iconSize={16} iconName="edit-clear-symbolic" />
      </St.Button>
      <St.Button
        class="popup-menu-item"
        onClicked={() => {
          extension.openPreferences()
          gnofi.close()
        }}
      >
        <St.Icon iconSize={16} iconName="org.gnome.Settings-symbolic" />
      </St.Button>
    </St.BoxLayout>
  )
}
