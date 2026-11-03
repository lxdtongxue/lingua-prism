export type Release = { version: string; date?: string; lead: string[]; groups: { label: string; items: string[] }[] }

// The site reads the same changelog as the repository; releases aren't copied by hand.
export function parseReleaseNotes(markdown: string): Release[] {
  const headings = [...markdown.matchAll(/^### (v[^\n（]+?)(?:（([^）]+)）)?\s*$/gm)]
  return headings.map((heading, i) => {
    const release: Release = { version: heading[1].trim(), date: heading[2], lead: [], groups: [] }
    const body = markdown.slice(heading.index! + heading[0].length, headings[i + 1]?.index)
    for (const line of body.split('\n').map((s) => s.trim()).filter(Boolean)) {
      if (/^[^：]+：$/.test(line)) release.groups.push({ label: line.slice(0, -1), items: [] })
      else if (line.startsWith('- ')) release.groups.at(-1)?.items.push(line.slice(2))
      else release.lead.push(line)
    }
    return release
  })
}
