import Meta from "gi://Meta"
import Shell from "gi://Shell"
import Clutter from "gi://Clutter"
import { InjectionManager } from "resource:///org/gnome/shell/extensions/extension.js"
import { overview, wm, layoutManager } from "resource:///org/gnome/shell/ui/main.js"
import { AppPickerSchema, useSettings } from "~schemas"
import { useGnofi } from "./Gnofi"
import { createBinding, onCleanup } from "gnim"
import { useConnect, useEffect } from "gnim-hooks"
import { useExtension } from "./extenstion"

function useReplaceOverviewSearch() {
  const { gnofi } = useGnofi()
  const injectionManager = new InjectionManager()
  const controller = overview.searchController
  const constrollerProto = controller.constructor.prototype
  const entry = overview.searchEntry.get_parent() as Clutter.Actor
  const entryVisibility = entry.visible
  const { replaceOverviewSearch: enable } = useSettings()

  function replace() {
    if (entry.visible) {
      entry.visible = false
      entry.height = 0
      injectionManager.overrideMethod(constrollerProto, "startSearch", () => {
        return function (e) {
          const event = e as Clutter.Event
          gnofi.open("")
          gnofi.text = String.fromCharCode(event.get_key_symbol())
        }
      })
    }
  }

  function disable() {
    if (!entry.visible) {
      entry.visible = entryVisibility
      entry.height = -1
      injectionManager.restoreMethod(constrollerProto, "startSearch")
    }
  }

  useEffect((get) => {
    if (get(enable)) {
      replace()
    } else {
      disable()
    }
  })

  onCleanup(() => {
    disable()
  })
}

function useHotkey() {
  const { settings } = useSettings()
  const { gnofi } = useGnofi()

  wm.addKeybinding(
    "window-hotkey",
    settings,
    Meta.KeyBindingFlags.NONE,
    Shell.ActionMode.NORMAL | Shell.ActionMode.POPUP | Shell.ActionMode.OVERVIEW,
    () => {
      const w: Meta.Window | null = global.display.get_focus_window()
      if (w && w.is_fullscreen() && w.showing_on_its_workspace()) {
        return
      }

      gnofi.open("")
    },
  )

  onCleanup(() => {
    wm.removeKeybinding("window-hotkey")
  })
}

function useOpenAtStartup() {
  const { gnofi } = useGnofi()
  const { openAtStartup } = useSettings()

  useConnect(
    layoutManager,
    // @ts-expect-error missing signal type
    "startup-complete",
    () => {
      if (openAtStartup.get()) {
        setTimeout(() => gnofi.open(""))
      }
    },
  )
}

function useCloseOnWorkspaceChange() {
  const { gnofi } = useGnofi()

  useConnect(global.workspaceManager, "active-workspace-changed", () => {
    gnofi.close()
  })
}

function useCloseOnOverviewChange() {
  const { gnofi } = useGnofi()

  useConnect(overview, "hiding", () => {
    gnofi.close()
  })

  useConnect(overview, "showing", () => {
    gnofi.close()
  })
}

function useCloseOnPickerClose() {
  const { closeOverview } = useSettings()
  const { gnofi } = useGnofi()
  const isOpen = createBinding(gnofi, "isOpen")

  useEffect((get) => {
    if (!get(isOpen) && closeOverview.get()) {
      overview.hide()
    }
  })
}

function useEnsureAppPicker() {
  const { searchPickers, setSearchPickers } = useSettings()
  const { gettext: t } = useExtension()

  useEffect((get) => {
    if (get(searchPickers).length === 0) {
      setSearchPickers([
        AppPickerSchema.new({
          name: t("Search applications"),
        }).dict,
      ])
    }
  })
}

export default function useInjections() {
  useReplaceOverviewSearch()
  useHotkey()
  useOpenAtStartup()
  useCloseOnPickerClose()
  useCloseOnWorkspaceChange()
  useCloseOnOverviewChange()
  useEnsureAppPicker()
}
