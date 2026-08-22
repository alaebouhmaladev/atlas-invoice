interface SidebarRouteQuery {
  [key: string]: string | null | Array<string | null> | undefined
}

function parseTarget(target: string): { path: string; query: URLSearchParams } {
  const [path, query = ''] = target.split('?')
  return { path, query: new URLSearchParams(query) }
}

function queryMatches(targetQuery: URLSearchParams, currentQuery: SidebarRouteQuery): boolean {
  for (const [key, expected] of targetQuery.entries()) {
    const actual = currentQuery[key]
    if (Array.isArray(actual) ? !actual.includes(expected) : actual !== expected) return false
  }
  return true
}

export function getActiveSidebarTarget(
  targets: string[],
  currentPath: string,
  currentQuery: SidebarRouteQuery = {}
): string | null {
  const matches = targets
    .map((target) => {
      const parsed = parseTarget(target)
      const pathMatches = currentPath === parsed.path || currentPath.startsWith(`${parsed.path}/`)
      if (!pathMatches || !queryMatches(parsed.query, currentQuery)) return null

      // A query-specific item wins over its path-only sibling. Otherwise the
      // deepest matching path wins, guaranteeing one active navigation item.
      const score = parsed.path.length * 10 + Array.from(parsed.query.keys()).length
      return { target, score }
    })
    .filter((match): match is { target: string; score: number } => match !== null)
    .sort((a, b) => b.score - a.score)

  return matches[0]?.target || null
}
