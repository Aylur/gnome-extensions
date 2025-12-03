import { defineSchemaList, Schema } from "gnim-schemas"

const id = "@domain@"
const path = `/${id.replaceAll(".", "/")}/`

export const extensionSchema = new Schema({ id, path })
  .key("whitelist-mode", "b", {
    default: false,
    summary: "Wether the filter list should behave as a whitelist or blacklist",
  })
  .key("whitelist", "as", {
    default: [],
    summary: "List of whitelisted items",
  })
  .key("blacklist", "as", {
    default: [],
    summary: "List of blacklisted items",
  })

export default defineSchemaList([extensionSchema])
