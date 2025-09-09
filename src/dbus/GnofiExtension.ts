import { DOMAIN, OBJECT_PATH } from "./dbus"
import { Service, iface, methodAsync } from "gnim/dbus"

interface Implementation {
  open(text: string): Promise<void>
  sendTipMessage(): Promise<void>
}

@iface(`${DOMAIN}.Extension`)
export default class GnofiExtension extends Service {
  private impl?: Implementation

  @methodAsync({ name: "text", type: "s" }, { name: "with-leader", type: "b" })
  Open(text: string) {
    return Promise.resolve(this.impl?.open(text))
  }

  @methodAsync()
  SendTipMessage() {
    return Promise.resolve(this.impl?.sendTipMessage())
  }

  serveExtension(impl: Implementation) {
    this.impl = impl
    return this.serve({ name: DOMAIN, objectPath: OBJECT_PATH })
  }

  proxy() {
    return super.proxy({ name: DOMAIN, objectPath: OBJECT_PATH })
  }
}
