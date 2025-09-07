# Gnofi

An extensible launcher, picker, search and command palette for Gnome.

> [!NOTE]
>
> Unfortunately this extension is not available on
> [extensions.gnome.org](https://extensions.gnome.org/). See
> [#1](https://github.com/Aylur/gnofi-gnome-extension/issues/1)

![Desktop Screenshot](https://github.com/user-attachments/assets/b444c452-1eb2-4735-94ff-eb3fbf877132)

## Features

### Gnome Shell Search Replacement

At its core, Gnofi is designed to replace Gnome Shell's search and move it out
of the overview. It allows you to:

- Customize the layout of the Application Search section
- Add Search Providers installed on the system
- Configure the layout of each provider independently

### Commands

You can set up commands that are invoked by prefixing the search with the
command leader (`:` by default) followed by the command itself. A command can be
a built-in picker, a search provider, or an IPC plugin.

For example, you can set the [Characters](https://apps.gnome.org/Characters/)
Search Provider as a command like `:c`, and search for characters without
cluttering the search window with applications and other results you don't care
about.

![Characters command](https://github.com/user-attachments/assets/c4ed70f7-c93b-45f8-bbe6-138b71c6a5f4)

### IPC Plugins

The most powerful feature of Gnofi is its extensibility through the IPC
interface. You can write a plugin in **any** programming language and:

- Extend the default search functionality
- Completely replace the default search
- Assign custom plugins as commands

> [!TIP]
>
> You can also assign the `dock` command to display something as default.
> ![Dock example](https://github.com/user-attachments/assets/684382ee-b039-4b6e-8312-f56114ddac7c)
