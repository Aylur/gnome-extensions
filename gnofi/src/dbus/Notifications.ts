// the Gio API can only be used with installed applications
// that come with a .desktop file, which we obviosly don't have

import GObject from "gi://GObject"
import { Service, Variant, iface, methodAsync, signal } from "gnim/dbus"

type NotifyArgs = [
  appName: string,
  replacesId: number,
  appIcon: string,
  summary: string,
  body: string,
  actions: string[],
  hints: Record<string, Variant<any>>,
  expireTimeout: number,
]

enum ClosedReason {
  EXPIRED = 1,
  DISMISSED = 2,
  CLOSED = 3,
  UNDEFINED = 4,
}

interface Signals extends GObject.SignalSignatures {
  "notification-closed": Notifications["NotificationClosed"]
  "action-invoked": Notifications["ActionInvoked"]
  "activation-token": Notifications["ActivationToken"]
}

@iface("org.freedesktop.Notifications")
class Notifications extends Service {
  @methodAsync(["s", "u", "s", "s", "s", "as", "a{sv}", "i"], ["u"])
  public async Notify(...args: NotifyArgs): Promise<[number]> {
    return Promise.reject(args)
  }

  @signal("u", "u")
  protected NotificationClosed(id: number, reason: ClosedReason) {
    throw [id, reason]
  }

  @signal("u", "s")
  protected ActionInvoked(id: number, key: string) {
    throw [id, key]
  }

  @signal("u", "s")
  protected ActivationToken(id: number, token: string) {
    throw [id, token]
  }

  connect<S extends keyof Signals>(
    signal: Extract<S, string>,
    callback: GObject.SignalCallback<this, Signals[S]>,
  ): number {
    return super.connect(signal, callback)
  }
}

export async function sendNotification(props: {
  summary: string
  body?: string
  actions?: Array<[label: string, callback: () => void]>
  imagePath?: string
}): Promise<void> {
  const actions = (props.actions ?? []).flatMap(([label], i) => [`${i}`, label])

  const proxy = await new Notifications().proxy()
  const [thisId] = await proxy.Notify(
    "Gnofi",
    0,
    "org.gnome.Shell.Extensions-symbolic",
    props.summary,
    props.body ?? "",
    actions,
    props.imagePath ? { "image-path": new Variant("s", props.imagePath) } : {},
    0,
  )

  return new Promise((resolve) => {
    const done = () => {
      handlers.map((id) => proxy.disconnect(id))
      proxy.stop()
      resolve()
    }

    const handlers = [
      proxy.connect("notification-closed", (_, id) => {
        if (id === thisId) {
          done()
        }
      }),
      proxy.connect("action-invoked", (_, id, key) => {
        if (id === thisId) {
          props.actions?.at(parseInt(key))?.[1]()
          done()
        }
      }),
    ]
  })
}
