#!/usr/bin/env nu

let limit = 12

let settings = {
  description: "Connect to known ssh hosts"
  hint: "Search from known ssh hosts"
  icon: "utilities-terminal-symbolic"
  margin: [2 0 0 0]
  gap: 2
}

def search_results [text: string] {
  let hosts = open $"($env.HOME)/.ssh/known_hosts"
  | split row "\n"
  | each {
    $in
    | split row " "
    | get 0
  }
  | uniq
  | to text
  | str trim
  | fzf -f $text
  | split row "\n"
  | where {|x| $x != "" }
  | take $limit

  if ($hosts | length) > 0 {
    $hosts | each {|host|
      [Button { onClicked:$host }
        [Label { text:$host xAlign:start xExpand:true }]
      ]
    }
  } else {
    [[Label { css:"padding: 9px 10px" text:"No match found" }]]
  }
}

def main [] {
  [settings $settings] | to json -r | print

  while true {
    match (head -n 1 | from json -s) {
      [action $host] => (do {
        systemd-run --user $env.TERMINAL -e ssh $host
        [close]
      })
      [search $text] => [result (search_results $text)]
      _ => [ignore]
    }
    | to json -r
    | print
  }
}
