import Clutter from "gi://Clutter"
import { createEffect, createContext, For, onCleanup, This } from "gnim"
import { Gnofi } from "gnofi"
import GnofiLogger from "~dbus/GnofiLogger"
import { useSettings } from "~schemas"
import Picker from "./Picker"

const GnofiContext = createContext<{ gnofi: Gnofi } | null>(null)

export function useGnofi() {
  const gnofi = GnofiContext.use()
  if (!gnofi) throw Error("missing GnofiProvider")
  return gnofi
}

export function GnofiProvider<T>(children: () => T) {
  const {
    commandLeader,
    visibleCommand,
    searchPickers,
    saveLogsInMemory,
    commands,
    searchDelay,
  } = useSettings()

  const logger = new GnofiLogger()
  const gnofi = new Gnofi({ keys: Clutter })

  gnofi.builtinHelpPicker.showAll = true
  logger.serve(saveLogsInMemory)

  createEffect(() => {
    gnofi.builtinDefaultPicker.searchDelay = searchDelay()
  })

  onCleanup(() => logger.stop())

  void (
    <This this={gnofi} visibleCommand={visibleCommand} commandLeader={commandLeader}>
      <For each={commands}>
        {(schema) => (
          <Picker schema={schema} gnofi={gnofi} logger={logger} schemas={commands} />
        )}
      </For>
      <For each={searchPickers} id={(schema) => schema.id}>
        {(schema) => (
          <Picker
            $type="default-only"
            schema={schema}
            gnofi={gnofi}
            logger={logger}
            schemas={searchPickers}
          />
        )}
      </For>
    </This>
  )

  return GnofiContext.provide({ gnofi: gnofi }, children)
}
