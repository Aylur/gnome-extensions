#!/usr/bin/env nu

let items = [
  firefox
  com.mitchellh.ghostty
  org.gnome.Nautilus
  org.gnome.Settings
  spotify
]

let settings = {
  margin: [4,0,0,0]
  gap: 6
  vertical: true
}

def Dock [] {
  $items | each {|item|
    [Button {
      css:"padding:12px"
      onClicked:$item
    }
      [Icon {
        iconName:$item
        iconSize:72
      }]
    ]
  }
}

mut init = false

while true {

  match (head -n 1 | from json -s) {
    [action $payload] => (do {
      systemd-run --user gtk-launch $payload
      [close]
    })
    _ => (if (not $init) {
      $init = true
      [batch [
        [settings $settings]
        [result (Dock)]
      ]]
    } else {
      [ignore]
    })
  }
  | to json -r
  | print
}
