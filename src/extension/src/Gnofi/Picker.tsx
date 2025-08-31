import {
  Gnofi,
  AppPicker,
  SearchPicker,
  PersistentExternalPicker,
  TransientExternalPicker,
} from "gnofi"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import St from "gi://St"
import { Accessor } from "gnim"
import GnofiLogger from "~dbus/GnofiLogger"
import {
  PickerSchema,
  AppPickerSchema,
  ExternalPickerSchema,
  SearchPickerSchema,
} from "~schemas"

export function getAppIcon(appInfo?: Gio.DesktopAppInfo) {
  let icon = appInfo?.get_string("Icon")
  if (icon && !icon.endsWith("-symbolic")) icon += "-symbolic"

  const symbolic =
    icon &&
    St.IconTheme.new().lookup_icon(icon, 24, St.IconLookupFlags.FORCE_SYMBOLIC) &&
    icon

  return symbolic || icon || "system-search-symbolic"
}

export default function Picker(props: {
  schema: PickerSchema
  gnofi: Gnofi
  schemas: Accessor<Array<PickerSchema>>
  logger: GnofiLogger
}) {
  const { schema, gnofi, schemas, logger } = props
  const { id, name } = schema

  // schemas are immutable and its props can't be bound
  // <For> filters them by id so `schema` here is not reactive
  // we have to find it from the current list
  const s = schemas((ps) => ps.find((p) => p.id === schema.id))

  if (schema instanceof AppPickerSchema) {
    return (
      <AppPicker
        command={id}
        description={name}
        hint={_("Search for applications")}
        onActivate={() => gnofi.close()}
      />
    )
  }

  if (schema instanceof SearchPickerSchema) {
    return (
      <SearchPicker
        command={id}
        description={name}
        hint={name}
        icon={getAppIcon(schema.appInfo)}
        onActivate={() => gnofi.close()}
        provider={schema}
        maxItems={s((s) => {
          if (s instanceof SearchPickerSchema) {
            return s.limit
          } else {
            console.error(Error("invalid schema type"))
            return 6
          }
        })}
      />
    )
  }
  if (schema instanceof ExternalPickerSchema) {
    function err(err: string) {
      console.error(id, err)
      logger.Log(id, err, GLib.LogLevelFlags.LEVEL_ERROR)
    }

    function warn(warn: string) {
      console.warn(id, warn)
      logger.Log(id, warn, GLib.LogLevelFlags.LEVEL_WARNING)
    }

    function log(log: string) {
      console.log(id, log)
      logger.Log(id, log, GLib.LogLevelFlags.LEVEL_MESSAGE)
    }

    if (schema.type === "transient") {
      return (
        <TransientExternalPicker
          command={id}
          description={name}
          gnofi={gnofi}
          executable={schema.executable}
          onError={(_, e) => err(e)}
          onWarning={(_, w) => warn(w)}
          onLog={(_, m) => log(m)}
        />
      )
    }
    if (schema.type === "persistent") {
      return (
        <PersistentExternalPicker
          command={id}
          description={name}
          gnofi={gnofi}
          executable={schema.executable}
          onError={(_, e) => err(e)}
          onWarning={(_, w) => warn(w)}
          onLog={(_, m) => log(m)}
        />
      )
    }
  }
  throw Error("unknown schema type")
}
