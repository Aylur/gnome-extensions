import { defineSchemaList, Schema } from "gnim-schemas"

export const schema = new Schema({
  id: "org.gnome.shell.extensions.gnofi",
  path: "/org/gnome/shell/extensions/gnofi/",
})
  .key("window-hotkey", "as", {
    default: [],
    summary: "Hotkey that opens the picker window",
  })
  .key("window-margin-top", "u", {
    default: 200,
    summary: "Space between picker window and the top of the screen",
  })
  .key("window-width", "u", {
    default: 500,
    summary: "Width of the picker window",
  })
  .key("close-overview", "b", {
    default: false,
    summary: "Also close Overview when closing the picker window",
  })
  .key("replace-overview-search", "b", {
    default: true,
    summary:
      "Hides the search entry in overview and opens the picker window instead when attempting to search",
  })
  .key("open-at-startup", "b", {
    default: false,
    summary: "Open the picker window on login",
  })
  .key("focusable-entry", "b", {
    default: false,
    summary: "Whether the search entry can be focused via keyboard navigation",
  })
  .key("visible-command", "b", {
    default: false,
    summary: "Whether the current command is visible",
  })
  .key("command-leader", "s", {
    default: ":",
    summary: "The command leader that switches to command mode",
  })
  .key("search-delay", "u", {
    default: 100,
    summary: "Debounce delay of the default search picker",
  })
  .key("panel-button", "(buiss)", {
    default: [true, 0, 0, "open-menu-symbolic", ""],
    summary: "Panel button settings: visibility, position, icon, label.",
  })
  .key("save-logs-in-memory", "b", {
    default: false,
    description:
      "Saves logs in memory so that its persistent between prefence dialog openings. Also helps debugging tremendously, since start up error logs are visible this way.",
  })
  .key("show-hidden-options", "b", {
    default: false,
  })
  .key("commands", "a{sa{sv}}", {
    default: {},
    summary: "List of pickers assigned as commands",
  })
  .key("search-pickers", "aa{sv}", {
    default: [],
    summary: "List of pickers assigned to the default search",
  })
  .key("preferences-page", "s", {
    default: "about",
  })
  .key("initial-notification", "b", {
    default: true,
  })

export default defineSchemaList([schema])
