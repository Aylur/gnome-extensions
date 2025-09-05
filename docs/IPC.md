# IPC Picker Interface

A **Gnofi External IPC Picker** is simply an executable program that
communicates with Gnofi using standard input and standard output. It receives
requests from Gnofi via _stdin_, and sends back commands via _stdout_ for Gnofi
to execute.

There are two types of plugins:

1. **Transient Plugins**: These handle a single request at a time. They receive
   one request and optionally return one command after which it exits.

2. **Persistent Plugins**: These remain running until Gnofi explicitly sends out
   an exit request. While active, they can:

   - Handle multiple requests and send multiple commands independently
   - Maintain internal state throughout their lifetime
   - Send commands asynchronously, without waiting for a request

[Requests](./#requests) and [Commands](./#commands) are represented as arrays
with two elements:

1. A **string** that specifies the action
2. A **payload** that contains the associated data

For example, an incoming search request from Gnofi might look like:

```json
["search", "text to search"]
```

And a command response sent back to Gnofi might look like:

```json
[
  "result",
  [
    ["Button", { "onClicked": "1" }, ["Label", { "text": "Item 1" }]],
    ["Button", { "onClicked": "2" }, ["Label", { "text": "Item 2" }]]
  ]
]
```

In this example:

- The `"result"` command tells Gnofi to display the result list in its UI.
- The payload describes a list of results, where a result is a UI component
  tree. In this example a `"Button"` with a `"Label"`.

## Commands

Commands are issued by plugins for Gnofi to handle. They are a tuple where the
first element is the command and the second element is the payload.

### settings

Let's you set some props on the Picker instance and the Grid component the UI is
rendered into.

- **description:** `string` The text which is shown in the Help Picker.
- **icon:** `string` A named icon which is shown next to the search entry when
  this picker is selected.
- **delay:** `number` Debounce in milliseconds to before each
  [`search`](./#search) request is issued.
- **hint:** `string` The placeholder hint text to show in the search entry.
- **vertical:** `boolean` Whether the Grid is vertical.
- **breakpoint:** `number` The number of results in a row/column.
- **gap:** `number` The gap between result items.
- **margin:** `[number, number, number, number]` The margin around the Grid. It
  is in CSS style: top, right, left, bottom.
- **homogeneous:** `boolean` Whether the rows and columns are homogeneously
  sized. It is `true` by default.

> [!NOTE] Example
>
> ```json
> [
>   "settings",
>   {
>     "description": "My awesome Picker",
>     "hint": "Start typing...",
>     "margin": [2, 0, 0, 0]
>   }
> ]
> ```

### result

Let's you set the results which are rendered into the UI. A result is a
component tree composed of [widgets](./#widgets).

You can set the full list with the `"result"` command or use _some_ of the
JavaScript
[Array methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#array_methods_and_empty_slots),
for example you can add an item to the end of the list with the `"result:push"`
command.

> [!NOTE] Example
>
> ```json
> [
>   "result",
>   [
>     ["Button", { "label": "item1" }],
>     ["Button", { "label": "item2" }]
>   ]
> ]
> ```

#### push

The `"result:push"` command adds a new item to the end of the list.

> [!NOTE] Example
>
> ```json
> ["result:push", ["Button", { "label": "item3" }]]
> ```

#### pop

The `"result:pop"` command lets you remove an item from the end of the list.

> [!NOTE] Example
>
> ```json
> ["result:pop"]
> ```

#### unshift

The `"result:unshift"` lets you insert an item to the start of the list.

> [!NOTE] Example
>
> ```json
> ["result:unshift", ["Button", { "label": "item0" }]]
> ```

#### shift

The `"result:shift"` command lets you remove an item from the start of the list.

> [!NOTE] Example
>
> ```json
> ["result:shift"]
> ```

#### slice

The `"result:slice"` command lets you slice the result from its end and start.

> [!NOTE] Example
>
> ```json
> ["result:slice", [1, -1]]
> ```

In this example the first item and last item in the list are removed.

#### remove

The `"result:remove"` command lets you remove an item by index.

> [!NOTE] Example
>
> ```json
> ["result:remove", 2]
> ```

### set-props

Let's you set properties on rendered UI components that have a reference id.

> [!NOTE] Example
>
> ```json
> [
>   "set-props",
>   {
>     "$": "my-button",
>     "label": "updated label"
>   }
> ]
> ```

### text

Sets the content of the search entry. Useful for handling
[`"complete"`](./#complete) requests.

> [!NOTE] Example
>
> ```json
> ["text", "new text content"]
> ```

### close

Closes the picker window.

> [!NOTE] Example
>
> ```json
> ["close"]
> ```

### open

Opens the picker window with the given text searched.

> [!NOTE] Example
>
> ```json
> ["open", "text"]
> ```

### focus

Moves focus between UI elements. Valid payloads: `"entry"`, `"left"`,
`"right"`,`"backward"`,`"forward"`,`"up"`,`"down"`.

> [!NOTE] Example
>
> ```json
> ["focus", "forward"]
> ```

### log

Logging commands.

> [!NOTE] Example
>
> ```json
> ["log", "hello world"]
> ```

#### warning

Warn level logging.

> [!NOTE] Example
>
> ```json
> ["log:warning", "hello world"]
> ```

#### error

Error level logging.

> [!NOTE] Example
>
> ```json
> ["log:error", "hello world"]
> ```

### batch

Let's you issue multiple commands in one. Mostly useful in Transient plugins.

> [!NOTE] Example
>
> ```json
> [
>   "batch",
>   [
>     ["log", "hello world"],
>     ["result:pop"],
>     ["result:push", ["Button", { "label": "item" }]]
>   ]
> ]
> ```

### ignore

Does nothing. Mostly useful in Transient plugins.

> [!NOTE] Example
>
> ```json
> ["ignore"]
> ```

## Requests

Requests are issued by Gnofi for plugins to handle. They are a tuple where the
first element is the request and the second element is the payload.

### search

Issued on each keystroke or optionally debounced if the [`delay`](./#settings)
property is set.

> [!NOTE] Example
>
> ```json
> ["search", "text"]
> ```

### action

Issued when a signal handler is invoked. The payload is the data set as the
handler.

> [!NOTE] Example
>
> This result item,
>
> ```json
> ["Button", { "onClicked": "data" }]
> ```
>
> When clicked will issue the following action request.
>
> ```json
> ["action", "data"]
> ```

### clear

Issued when the picker is no longer active and is asked to clear its UI.

> [!NOTE] Example
>
> ```json
> ["clear"]
> ```

### activate

Issued when the search entry is activated, for example when the enter key is
pressed. The payload is the current content of the search entry.

> [!NOTE] Example
>
> ```json
> ["activate", "text"]
> ```

### complete

Issued when an autocompletion is attempted by the user. Usually when the search
entry is focused and the user presses the Tab key. The payload is the current
content of the search entry.

> [!NOTE] Example
>
> ```json
> ["complete", "text"]
> ```

### exit

Issued when the process should exit. For example when the command is removed or
when the Extension is disabled. Only issued for Persistent plugins.

> [!NOTE] Example
>
> ```json
> ["exit"]
> ```

<!--  -->

> [!IMPORTANT]
>
> The process **has** to exit, otherwise the extension cannot cleanly disable.

## Widgets

Widgets are JSON serialized
[`St.Widget`](https://gjs-docs.gnome.org/st17~17/st.widget) instances. A
serialized widget is a tuple where the first element is the constructor, the
second element are the properties and the rest of the elements are children
widgets.

```typescript
type Node = [
  "Label" | "Box" | "Icon" | "Button",
  Record<string, unknown>,
  ...Node[],
]
```

> [!TIP]
>
> Enum types can be passed by their names: for example
> [`St.BoxLayout`](https://gjs-docs.gnome.org/st17~17/st.boxlayout) oriantation
> property.
>
> ```json
> ["Box", { "oriantation": "vertical" }]
> ```

<!--  -->

> [!NOTE] Example
>
> <!-- prettier-ignore -->
> ```json
> ["Button", { "$": "button1", "onClicked": "data" },
>   ["Box", {
>     "oriantation": "vertical",
>     "style": "border: 1px solid -st-accent-color;"
>   },
>     ["Box", {},
>       ["Label", { "text": "top left", "xExpand": true }]
>       ["Label", { "text": "top right", "xAlign": "end" }]
>     ]
>     ["Label", { "text": "main content", "style": "font-weight: bold;" }]
>   ]
> ]
> ```

The properties can have a special `$` property which can be used in the
[`set-props`](./#set-props) command to reference widget instances.

### Label

- [`St.Label`](https://gjs-docs.gnome.org/st17~17/st.label)

> [!NOTE] Example
>
> ```json
> ["Label", { "text": "content" }]
> ```

<!--  -->

> [!WARNING]
>
> Labels cannot have any children.

### Box

- [`St.BoxLayout`](https://gjs-docs.gnome.org/st17~17/st.boxlayout)

> [!NOTE] Example
>
> <!-- prettier-ignore -->
> ```json
> ["Box", { "oriantation": "horizontal" },
>   ["Icon", {}],
>   ["Label", {}]
> ]
> ```

<!--  -->

> [!TIP]
>
> Box can have multiple children.

### Icon

- [`St.Icon`](https://gjs-docs.gnome.org/st17~17/st.icon)

> [!NOTE] Example
>
> ```json
> ["Icon", { "iconName": "system-search-symbolic" }]
> ```

<!--  -->

> [!WARNING]
>
> Icons cannot have any children.

### Button

- [`St.Button`](https://gjs-docs.gnome.org/st17~17/st.button)

Buttons have `canFocus` set to `true` by default. If you don't want them to be
focusable by key navigation set it to `false`. Buttons are also implicitly given
the `popup-menu-item` to make them look Gnome Shell native.

> [!NOTE] Example
>
> <!-- prettier-ignore -->
> ```json
> ["Button", {
>   "iconName": "system-search-symbolic",
>   "onClicked": "data",
>   "onKeyFocusIn": "data"
> },
>   ["Icon"]
> ]
> ```

<!-- -->

> [!TIP]
>
> Button can have a single child.
