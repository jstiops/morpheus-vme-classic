/**
 * Returns the VME Manager base URL (e.g. https://vman01.ns24lab.local).
 * Injected at deploy time via window.__VME_MANAGER_URL__ in index.html.
 * Falls back to the current origin if not set (useful during local dev).
 */
export function getVmeManagerUrl(): string {
  const injected = (window as unknown as { __VME_MANAGER_URL__?: string }).__VME_MANAGER_URL__
  if (injected && injected !== 'VME_MANAGER_URL_PLACEHOLDER') {
    return injected.replace(/\/$/, '')
  }
  return window.location.origin
}

export function consoleUrl(serverId: number): string {
  return `${getVmeManagerUrl()}/terminal/server/${serverId}?consoleMode=hypervisor`
}
