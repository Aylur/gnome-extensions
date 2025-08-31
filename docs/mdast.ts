#!/usr/bin/env node

import { fromMarkdown } from "mdast-util-from-markdown"
import { visit } from "unist-util-visit"

declare global {
  const process: {
    argv: string[]
  }
}

const [, , doc] = process.argv
const root = fromMarkdown(doc)

// we don't need position so we are deleting it to reduce bundle size
visit(root, (node) => {
  delete node.position
})

console.log(JSON.stringify(root))
