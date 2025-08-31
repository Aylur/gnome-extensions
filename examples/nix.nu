#!/usr/bin/env nu

let max_items = 6

let prefix = "legacyPackages.x86_64-linux."

let nixpkgs = nix search nixpkgs ^ --json
| complete
| get stdout # ignoring stderr because it blocks io
| from json

let settings = {
  description: "Launch packages from nixpkgs"
  hint: "Launch packages from nixpkgs"
  icon: "nix-snowflake"
  margin: [2 0 0 0]
  gap: 2
}

let list = $nixpkgs
| columns
| each { $in | str replace $prefix "" }
| to text

def search [text: string] {
  $list
  | fzf -f $text
  | head -n $max_items
  | lines
  | each {|name|
    $nixpkgs
    | get $"($prefix)($name)"
    | upsert key $name
  }
}

def result []: list<record> -> list {
  $in | each {|pkg|
    [Button {
      canFocus:true
      xExpand:true
      onClicked:$pkg.key
      css:"padding:5px"
    }
      [Box { xExpand:true orientation:vertical }
        [Box { }
          [Label {
            xExpand:true
            text:$pkg.key
            css:"font-weight:bold;text-size:1.1em;"
          }]
          [Label {
            text:$pkg.version
            opacity:150
          }]
        ]
        [Label {
          text:$pkg.description
        }]
      ]
    ]
  }
}

def initial-result [] {
  [Box {
    css:"margin-top:6px;margin-bottom:2px",
    xAlign:center
    xExpand:true
  }
    [Icon {
      iconName:system-search-symbolic
      iconSize:16
      yAlign:center
    }]
    [Label {
      text:"Start typing to search..."
      yAlign:center
      css:"font-weight:bold;text-size:1.1em;margin-left:4px"
    }]
  ]
}

def launch [text: string --search] {
  let key = if $search {
    search $text | first | get key
  } else {
    $text
  }

  [log (systemd-run --user nix run $"nixpkgs#($key)")]
  | to json -r
  | print
}

def main [] {
  [settings $settings] | to json -r | print

  while true {
    match (head -n 1 | from json -s) {
      [search $text] => (do {
        [result (if ($text | str trim) == "" {
          [(initial-result)]
        } else {
          (search $text | result)
        })]
      })
      [activate $text] => (do {
        try {
          launch $text --search
          [close]
        } catch {
          [ignore]
        }
      })
      [action $key] => (do {
        launch $key
        [close]
      })
      [exit] => exit
      _ => []
    }
    | to json -r
    | print
  }
}
