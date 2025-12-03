#!/usr/bin/env -S gjs -m

import GLib from "gi://GLib"
import Eval from "./Eval"
import { gettext as t } from "gettext"
import { exit } from "system"

const proxy = await new Eval().proxy()
const expression = ARGV[0]

if (!expression) {
  printerr(t("Expected an expression or file"))
  exit(1)
}

if (GLib.file_test(expression, GLib.FileTest.EXISTS)) {
  const rundir = GLib.get_user_runtime_dir() || "/tmp"
  const now = GLib.DateTime.new_now_local().format("%H_%M_%S")!
  const mod = `${rundir}/gnome-eval${now}.js`

  const esbuild = [
    GLib.find_program_in_path("esbuild"),
    "--bundle",
    expression,
    "--outfile",
    mod,
    "--format=esm",
    "--sourcemap=inline",
    "--external:gi://*",
    "--external:resource://*",
    "--external:system",
    "--log-level=warning",
  ]

  GLib.spawn_command_line_sync(esbuild.join(" "))
  const [res] = await proxy.RunModule(expression)
  print(res)
} else {
  const [res] = await proxy.Eval(expression)
  print(res)
}
