import GLib from "gi://GLib"
import GObject from "gi://GObject"
import { DOMAIN, OBJECT_PATH } from "./dbus"
import { Service, iface, signal, methodAsync } from "gnim/dbus"
import type { Accessor } from "gnim"

export type Log = [log: string, level: GLib.LogLevelFlags]

interface LoggerSignals extends GObject.Object.SignalSignatures {
  log: GnofiLogger["Log"]
  cleared: GnofiLogger["Cleared"]
}

@iface(`${DOMAIN}.Logger`)
export default class GnofiLogger extends Service {
  declare $signals: LoggerSignals

  private saveLogsInMemory!: Accessor<boolean>

  serve(saveLogsInMemory: Accessor<boolean>) {
    this.saveLogsInMemory = saveLogsInMemory
    return super.serve({ name: DOMAIN, objectPath: OBJECT_PATH })
  }

  static proxy() {
    const logger = new GnofiLogger()
    return logger.proxy({ name: DOMAIN, objectPath: OBJECT_PATH })
  }

  private _logs = new Map<string, Array<Log>>()

  @signal(
    { name: "object", type: "s" },
    { name: "log", type: "s" },
    { name: "level", type: "i" },
  )
  Log(key: string, log: string, level: GLib.LogLevelFlags) {
    if (this.saveLogsInMemory.peek()) {
      const arr = this._logs.get(key) || new Array<Log>()
      arr.push([log, level] as const)
      this._logs.set(key, arr)
    }
  }

  @signal({ name: "object", type: "s" })
  Cleared(key: string) {
    this._logs.delete(key)
  }

  @methodAsync({ name: "object", type: "s" })
  async Clear(key: string) {
    this.Cleared(key)
  }

  @methodAsync([{ name: "object", type: "s" }], [{ name: "logs", type: "a(si)" }])
  async GetLogs(key: string): Promise<[Array<Log>]> {
    return [this._logs.get(key) || []]
  }

  connect<S extends keyof LoggerSignals>(
    signal: S,
    callback: GObject.SignalCallback<this, LoggerSignals[S]>,
  ): number {
    return super.connect(signal, callback)
  }
}
