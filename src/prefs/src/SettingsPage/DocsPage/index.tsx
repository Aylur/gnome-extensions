import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import { copyToClipboard, openUri } from "#/utils"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import Pango from "gi://Pango"
import { createComputed, createRoot, createState, For, jsx } from "gnim"
import Markdown from "./Markdown"
import { useStyle } from "gnim-hooks/gtk4"

const SPLIT_BREAKPOINT = 720

function escapeMarkup(markup: string) {
  const [, , text] = Pango.parse_markup(markup, -1, "")
  return text
}

function headerDepth(label: Gtk.Label): number {
  for (const c of label.cssClasses) {
    if (c.startsWith("title-")) {
      return parseInt(c.slice(6))
    }
  }
  return 0
}

export default function DocsPage({ window }: { window: Adw.PreferencesWindow }) {
  return createRoot((dispose) => {
    let searchentry: Gtk.SearchEntry
    let searchbar: Gtk.SearchBar
    let viewport: Gtk.Viewport
    let contentpage: Adw.NavigationPage

    const [headers, setHeaders] = createState(new Array<Gtk.Label>())
    const [search, setSearch] = createState("")
    const [collapsed, setCollapsed] = createState(false)
    const [showSideBar, setShowSideBar] = createState(false)
    const [searchModeEnabled, setSearchModeEnabled] = createState(false)

    const toc = headers((label) => label.filter((toc) => headerDepth(toc) < 4))

    const searchBarStyle = useStyle({
      "&": {
        ">revealer >box": {
          "background-color": "transparent",
        },
      },
    })

    function navigate(name: string) {
      setSearchModeEnabled(false)

      if (name.startsWith("#")) name = name.slice(1)
      if (name.startsWith("./#")) name = name.slice(3)

      const widget = headers.get().find((label) => label.name === name)

      if (widget) {
        // FIXME: this scrolls from the bottom and looks bad
        const adj = viewport.vadjustment
        adj.value = adj.upper - adj.pageSize
        setTimeout(() => viewport.scroll_to(widget, null), 100)

        if (collapsed.get()) {
          setShowSideBar(false)
        }
      } else {
        openUri(name)
      }
    }

    function startSearch() {
      setShowSideBar(true)
      setSearchModeEnabled(true)
      searchentry.grab_focus()
    }

    function init(self: Adw.NavigationPage) {
      window.push_subpage(self)
      if (window.get_width() > SPLIT_BREAKPOINT) {
        setCollapsed(true)
      }
      searchbar.set_key_capture_widget(contentpage)
    }

    return (
      <Adw.NavigationPage $={init} onHiding={dispose} title={t("IPC Documentation")}>
        <Adw.BreakpointBin widthRequest={100} heightRequest={300}>
          <Adw.Breakpoint
            onApply={() => setCollapsed(true)}
            onUnapply={() => setCollapsed(false)}
            condition={Adw.BreakpointCondition.new_length(
              Adw.BreakpointConditionLengthType.MAX_WIDTH,
              SPLIT_BREAKPOINT,
              Adw.LengthUnit.SP,
            )}
          />

          <Adw.OverlaySplitView
            showSidebar={showSideBar}
            collapsed={collapsed}
            onNotifyShowSidebar={(s) => setShowSideBar(s.showSidebar)}
            onNotifyCollapsed={(s) => setCollapsed(s.collapsed)}
            maxSidebarWidth={200}
          >
            <Adw.NavigationPage
              $={(self) => (contentpage = self)}
              $type="sidebar"
              title={t("Contents")}
            >
              <Adw.ToolbarView>
                <Adw.HeaderBar $type="top" showTitle>
                  <Gtk.Button
                    $type="end"
                    class="flat"
                    iconName="system-search-symbolic"
                    onClicked={startSearch}
                  />
                </Adw.HeaderBar>
                <Gtk.Box orientation={Gtk.Orientation.VERTICAL}>
                  <Gtk.SearchBar
                    $={(self) => (searchbar = self)}
                    class={searchBarStyle}
                    name="docs-searcbar"
                    searchModeEnabled={searchModeEnabled}
                    onNotifySearchModeEnabled={(s) =>
                      setSearchModeEnabled(s.searchModeEnabled)
                    }
                  >
                    <Gtk.SearchEntry
                      $={(self) => (searchentry = self)}
                      searchDelay={0}
                      onSearchChanged={({ text }) => setSearch(text)}
                      onStopSearch={() => setSearch("")}
                    />
                  </Gtk.SearchBar>
                  <Gtk.ScrolledWindow
                    class="undershoot-bottom"
                    vexpand
                    vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                    hscrollbarPolicy={Gtk.PolicyType.NEVER}
                  >
                    <Gtk.Box
                      marginStart={12}
                      marginEnd={12}
                      orientation={Gtk.Orientation.VERTICAL}
                    >
                      <For each={toc}>
                        {(label) => (
                          <Gtk.Revealer
                            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
                            revealChild={search(
                              (s) =>
                                s === "" ||
                                label.label.toLowerCase().includes(s.toLowerCase()),
                            )}
                          >
                            <Gtk.Button
                              class="flat"
                              onClicked={() => navigate(label.name)}
                            >
                              <Gtk.Label
                                css="font-weight: normal;"
                                marginStart={10 * headerDepth(label)}
                                halign={Gtk.Align.START}
                                label={
                                  headerDepth(label) === 1
                                    ? t("Overview")
                                    : escapeMarkup(label.label)
                                }
                              />
                            </Gtk.Button>
                          </Gtk.Revealer>
                        )}
                      </For>
                    </Gtk.Box>
                  </Gtk.ScrolledWindow>
                  <Gtk.Box
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    spacing={4}
                    valign={Gtk.Align.END}
                    orientation={Gtk.Orientation.VERTICAL}
                  >
                    <Gtk.Button
                      class="flat"
                      tooltipText={import.meta.EXAMPLES_URL}
                      onClicked={() => openUri(import.meta.EXAMPLES_URL)}
                    >
                      <Adw.ButtonContent
                        label={t("Full Examples")}
                        iconName="adw-external-link-symbolic"
                      />
                    </Gtk.Button>
                    <Gtk.Button
                      class="flat"
                      tooltipText={import.meta.DOCS_URL}
                      onClicked={() => openUri(import.meta.DOCS_URL)}
                    >
                      <Adw.ButtonContent
                        label={t("Read Online")}
                        iconName="adw-external-link-symbolic"
                      />
                    </Gtk.Button>
                  </Gtk.Box>
                </Gtk.Box>
              </Adw.ToolbarView>
            </Adw.NavigationPage>

            <Adw.NavigationPage $type="content" title={t("IPC Documentation")}>
              <Adw.ToolbarView>
                <Adw.HeaderBar $type="top" showTitle showBackButton={collapsed}>
                  <Gtk.Button
                    visible={collapsed}
                    onClicked={() => setShowSideBar(true)}
                    iconName="sidebar-show-symbolic"
                    tooltipText={t("Show Table of Contents")}
                  />
                  <Gtk.Button
                    $type="end"
                    visible={createComputed((get) => !get(showSideBar) || get(collapsed))}
                    class="flat"
                    iconName="system-search-symbolic"
                    onClicked={startSearch}
                  />
                </Adw.HeaderBar>
                <Gtk.ScrolledWindow hexpand>
                  <Gtk.Viewport $={(self) => (viewport = self)}>
                    <Adw.Clamp maximumSize={800}>
                      <Adw.Bin
                        marginTop={16}
                        marginBottom={16}
                        marginStart={16}
                        marginEnd={16}
                      >
                        {Adw.MINOR_VERSION >= 7 ? (
                          <Markdown
                            ref={(self) => setHeaders(self.headers)}
                            md={import.meta.IPC_DOC}
                            onNavigation={navigate}
                            onCopy={(text) => copyToClipboard(text, window)}
                          />
                        ) : (
                          <Gtk.Button
                            css="padding: 3px 18px; color: var(--destructive-bg-color);"
                            valign={Gtk.Align.CENTER}
                            halign={Gtk.Align.CENTER}
                            onClicked={() =>
                              window.add_toast(
                                createRoot((dispose) =>
                                  jsx(Adw.Toast, {
                                    title: t("You can read it online."),
                                    buttonLabel: t("Open in Browser"),
                                    onDismissed: dispose,
                                    onButtonClicked: () => {
                                      dispose()
                                      openUri(import.meta.DOCS_URL)
                                    },
                                  }),
                                ),
                              )
                            }
                          >
                            {t("This page requires libadwaita >=1.7 to be rendered.")}
                          </Gtk.Button>
                        )}
                      </Adw.Bin>
                    </Adw.Clamp>
                  </Gtk.Viewport>
                </Gtk.ScrolledWindow>
              </Adw.ToolbarView>
            </Adw.NavigationPage>
          </Adw.OverlaySplitView>
        </Adw.BreakpointBin>
      </Adw.NavigationPage>
    )
  })
}
