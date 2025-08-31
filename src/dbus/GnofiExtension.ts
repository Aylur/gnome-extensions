import { DOMAIN } from "./dbus"
import { Service, iface, methodAsync } from "gnim/dbus"

interface Implementation {
  open(text: string): Promise<void>
  sendTipMessage(): Promise<void>
}

@iface(`${DOMAIN}.Extension`)
export default class GnofiExtension extends Service {
  private impl?: Implementation

  @methodAsync("s")
  Open(text: string) {
    return Promise.resolve(this.impl?.open(text))
  }

  @methodAsync()
  SendTipMessage() {
    return Promise.resolve(this.impl?.sendTipMessage())
  }

  serveExtension(impl: Implementation) {
    this.impl = impl
    return this.serve({ name: DOMAIN })
  }

  proxy() {
    return super.proxy({ name: DOMAIN })
  }
}
