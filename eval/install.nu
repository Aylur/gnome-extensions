#!/usr/bin/env nu

def transpile [infile: string, outfile: string] {
    (esbuild
        --bundle $infile
        --outfile=$"($outfile)"
        --format=esm
        --sourcemap=inline
        --external:gi://*
        --external:resource://*
        --external:gettext
        --external:system
        --log-level=warning
    )
}

def main [
    --prefix: string # Defaults to ~/.local
] {
    let dir = $prefix | default $"($env.HOME)/.local"
    let uuid = open metadata.json | get uuid
    let extdir = $"($dir)/share/gnome-shell/extensions/($uuid)"
    let bindir = $"($dir)/bin"

    # extension
    mkdir $extdir
    cp metadata.json $extdir
    transpile src/extension.ts $"($extdir)/extension.js"

    # executable client
    mkdir $bindir
    transpile src/client.ts $"($bindir)/gnome-eval"
}
