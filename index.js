/**
 * Host half of the sidebar-logo bundle.
 *
 * The bundle needs one enabled Loader entry so the browser module graph carries
 * `client.js`; everything this plugin does — the sidebar brand occupants and
 * the Settings page — runs in the Client module, which stores its settings in
 * the browser. Keep this half dependency-free: it imports nothing, so it
 * activates on any profile without touching Host services.
 */
export function apply() {}
