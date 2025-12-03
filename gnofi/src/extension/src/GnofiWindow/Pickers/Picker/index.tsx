import { Accessor } from "gnim"
import * as Gnofi from "gnofi"
import AppPicker from "./AppPicker"
import SearchPicker from "./SearchPicker"
import ExternalPicker from "./ExternalPicker"
import {
  AppPickerSchema,
  ExternalPickerSchema,
  SearchPickerSchema,
  PickerSchema,
} from "~schemas"

export default function Picker(props: {
  picker: Gnofi.Picker
  schema: Accessor<PickerSchema | undefined>
}) {
  const { picker, schema } = props

  if (picker instanceof Gnofi.AppPicker) {
    return (
      <AppPicker
        picker={picker}
        schema={schema((s) => {
          if (!(s instanceof AppPickerSchema)) {
            throw Error("invalid AppPickerSchema")
          }
          return s
        })}
      />
    )
  }

  if (picker instanceof Gnofi.SearchPicker) {
    return (
      <SearchPicker
        picker={picker}
        schema={schema((s) => {
          if (!(s instanceof SearchPickerSchema)) {
            throw Error("invalid SearchPickerSchema")
          }
          return s
        })}
      />
    )
  }

  if (picker instanceof Gnofi.ExternalPicker) {
    return (
      <ExternalPicker
        picker={picker}
        schema={schema((s) => {
          if (!(s instanceof ExternalPickerSchema)) {
            throw Error("invalid ExternalPickerSchema")
          }
          return s
        })}
      />
    )
  }

  throw Error("unknown picker type")
}
