/**
 * Client half of the sidebar-logo bundle.
 *
 * It does three things, all in the browser:
 *
 * 1. Occupies `sidebar.brand.mark` and `sidebar.brand.name` — the two cells the
 *    sidebar shell leaves open for brand artwork. Each cell is occupied only
 *    while the user has configured the piece it carries (a mark image for the
 *    first; a wordmark image, name text, or badge text for the second), so an
 *    untouched install and every field left empty keep the shipped artwork.
 *    Occupancy uses priority -10: a single slot allows one entry per priority
 *    and the LOWEST priority renders, so this entry shadows the shipped one at
 *    0 and releasing it brings the shipped artwork straight back.
 * 2. Contributes a Settings page (`settings.section` id `sidebar-logo`) that
 *    edits the mark image, the name text, the badge text, and an optional wide
 *    wordmark image.
 * 3. Persists those four strings in this browser's localStorage and keeps the
 *    sidebar in sync through a tiny snapshot store.
 *
 * Written as plain JavaScript because a bundle installed from a directory ships
 * `client.js` as-is: no JSX, no harness package imports (only React from the
 * browser module table), and no stylesheet build step — the Settings page
 * carries its own component-local <style> element and inline styles.
 */
window.__ModuleLoader__.load({
  id: '@local/sidebar-logo',
  factory(require) {
    'use strict'

    const React = require('react')
    const h = React.createElement
    const { useEffect, useRef, useState, useSyncExternalStore } = React

    /** Dictionary namespace, also declared on every slot registration. */
    const NS = 'sidebar-logo'
    /** localStorage key; bump the suffix if the stored shape ever changes. */
    const STORAGE_KEY = 'dsh.sidebar-logo.v1'
    /** Lowest priority renders in a single slot; -10 shadows the shipped occupant at 0. */
    const BRAND_PRIORITY = -10
    /** Every stored string field. */
    const FIELDS = ['mark', 'wordmark', 'name', 'badge']
    /** Stored flag: occupy the mark cell with nothing, so a self-contained wordmark can stand alone. */
    const HIDE_MARK = 'hideMark'
    /** Stored flag: show no logo at all and pull the rest of the sidebar up. */
    const HIDE_BRAND = 'hideBrand'
    /**
     * The "no logo" mode removes the shell's brand row, which is otherwise a
     * fixed 60 px band even with both brand cells empty. The rule is keyed on
     * the invisible marker this plugin renders and finds the row by HOW DEEP
     * that marker sits — no hashed class name is involved, so a shell that
     * changes its nesting makes the rule match nothing (the row then simply
     * stays where it is) instead of hiding an unrelated element:
     *
     *   row > brand link > identity > cell > marker      (4 levels up)
     *
     * The row goes entirely, including the panel toggle that sits beside the
     * brand. That is deliberate: the user asked for everything below to move
     * up. `Mod+B` keeps collapsing the sidebar, and the collapsed rail keeps
     * its own expand button because the rule ships from the name cell, which
     * the shell renders only while the sidebar is expanded.
     */
    const HIDDEN_RULES = '*:has(> * > * > * > [data-dsh-logo-hidden]){display:none!important;}'
    /** Downscaled raster edges: 4x the 24px mark and 4x the 22px wordmark height. */
    const MARK_EDGE = 96
    const WORDMARK_HEIGHT = 96
    const WORDMARK_MAX_WIDTH = 640
    /** Cap for an image kept as an untouched data URL (SVG passthrough included). */
    const MAX_EMBEDDED_BYTES = 256 * 1024

    const TRANSLATIONS = {
      en: {
        'section.title': 'Sidebar logo',
        'intro': 'Replace parts of the logo in the sidebar’s top-left corner. A part you leave blank keeps the shipped DeepSeek artwork; the preview below follows your edits.',
        'preview.label': 'Preview',
        'preview.empty': 'Using the shipped logo',
        'mark.title': 'Mark image',
        'mark.desc': 'Square image drawn at 24 × 24 px in place of the DeepSeek whale.',
        'wordmark.title': 'Wordmark image',
        'wordmark.desc': 'A wide logo image shown after the mark; while set, it replaces the name text.',
        'name.title': 'Name',
        'name.desc': 'Text beside the mark.',
        'badge.title': 'Badge',
        'badge.desc': 'Short tag after the name, like HARNESS.',
        'hideMark.title': 'Hide the mark cell',
        'hideMark.desc': 'For a wordmark image that already contains its own mark: the mark cell renders nothing instead of the shipped whale.',
        'hideBrand.title': 'Hide the logo row',
        'hideBrand.desc': 'Show no logo at all: the brand cells stay empty and the row shrinks to the panel toggle, so everything below moves up.',
        'name.placeholder': 'Acme',
        'badge.placeholder': 'HARNESS',
        'choose': 'Choose image…',
        'clear': 'Clear',
        'reset': 'Reset to shipped logo',
        'note': 'Saved in this browser only.',
        'empty': 'No image',
        'error.unreadable': 'That image could not be read.',
        'error.tooLarge': 'That image is too large (256 KB maximum).',
        'error.storage': 'This browser refused to save the change.',
        'presets.title': 'Presets',
        'presets.desc': 'Fill every field from one brand in a single click; each field stays editable afterwards.',
        'presets.claude': 'Claude Code',
        'presets.codex': 'Codex',
        'presets.none': 'No logo',
      },
      zh: {
        'section.title': '侧边栏 Logo',
        'intro': '按部分替换侧边栏左上角的 logo。留空的项保持 DeepSeek 原样；下方预览会随编辑更新。',
        'preview.label': '预览',
        'preview.empty': '正在使用原 logo',
        'mark.title': '徽标图片',
        'mark.desc': '替代鲸鱼的方形图片，以 24 × 24 px 显示。',
        'wordmark.title': '字标图片',
        'wordmark.desc': '跟在徽标后面的字标图片；设置后取代名称文字。',
        'name.title': '名称',
        'name.desc': '徽标旁边的文字。',
        'badge.title': '角标',
        'badge.desc': '名称后面的短角标，例如 HARNESS。',
        'hideMark.title': '隐藏徽标格',
        'hideMark.desc': '给自带星芒的字标图片单独显示用：徽标格留空，不再显示官方鲸鱼。',
        'hideBrand.title': '隐藏整行 logo',
        'hideBrand.desc': '完全不显示 logo：品牌位留空，顶部行收到只剩折叠按钮的高度，下面的内容整体上移。',
        'name.placeholder': '示例公司',
        'badge.placeholder': 'HARNESS',
        'choose': '选择图片…',
        'clear': '清除',
        'reset': '恢复原 logo',
        'note': '仅保存在当前浏览器。',
        'empty': '未选择',
        'error.unreadable': '无法读取这张图片。',
        'error.tooLarge': '图片过大（上限 256 KB）。',
        'error.storage': '当前浏览器拒绝保存这次修改。',
        'presets.title': '预设',
        'presets.desc': '一键把整套配置换成某个品牌的预设；之后仍可逐项修改。',
        'presets.claude': 'Claude Code',
        'presets.codex': 'Codex',
        'presets.none': '无 logo',
      },
    }

    // >>> preset-assets (generated by tools/embed-presets.mjs — do not edit by hand)
    const PRESET_ASSETS = {
      CLAUDE_SPARK: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTQiIGhlaWdodD0iOTQiIHZpZXdCb3g9IjAgMCA5NCA5NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE4Ljc2NTcgNjIuNDQzN0wzNy4xODIyIDUyLjExNjdMMzcuNDg1NyA1MS4yMTIyTDM3LjE4MjIgNTAuNzA4NUgzNi4yNzE1TDMzLjE4NTIgNTAuNTIwOEwyMi42NjE1IDUwLjIzOTFMMTMuNTU0NSA0OS44NjM2TDQuNzAwNDQgNDkuMzk0MkwyLjQ3NDI4IDQ4LjkyNDhMMC4zOTk5MDIgNDYuMTU1M0wwLjYwMjI4MSA0NC43OTRMMi40NzQyOCA0My41MjY2TDUuMTU1NzkgNDMuNzYxM0wxMS4wNzU0IDQ0LjE4MzdMMTkuOTggNDQuNzk0TDI2LjQwNTUgNDUuMTY5NUwzNS45Njc5IDQ2LjE1NTNIMzcuNDg1N0wzNy42ODgxIDQ1LjU0NUwzNy4xODIyIDQ1LjE2OTVMMzYuNzc3NCA0NC43OTRMMjcuNTY5MiAzOC41NTA4TDE3LjYwMjEgMzEuOTc5MUwxMi4zOTA4IDI4LjE3NjlMOS42MDgxMiAyNi4yNTI0TDguMTkxNDcgMjQuNDY4Nkw3LjU4NDMzIDIwLjUyNTZMMTAuMTE0MSAxNy43MDkxTDEzLjU1NDUgMTcuOTQzOEwxNC40MTQ2IDE4LjE3ODVMMTcuOTA1NiAyMC44NTQyTDI1LjM0MyAyNi42Mjc5TDM1LjA1NzIgMzMuNzYyOUwzNi40NzM5IDM0LjkzNjRMMzcuMDQ0MyAzNC41NTE0TDM3LjEzMTYgMzQuMjc5MkwzNi40NzM5IDMzLjE5OTZMMzEuMjEyIDIzLjY3MDZMMjUuNTk2IDEzLjk1MzlMMjMuMDY2MyA5LjkxNjk1TDIyLjQwODYgNy41MjI5NkMyMi4xNTM4IDYuNTE4MzEgMjIuMDAzOCA1LjY4NzE0IDIyLjAwMzggNC42NTk1N0wyNC44ODc3IDAuNzE2NTQ0TDI2LjUwNjcgMC4yMDAxOTVMMzAuNDAyNSAwLjcxNjU0NEwzMi4wMjE1IDIuMTI0NzdMMzQuNDUwMSA3LjY2Mzc5TDM4LjM0NTggMTYuMzQ3OEw0NC40MTcyIDI4LjE3NjlMNDYuMTg4IDMxLjY5NzVMNDcuMTQ5MyAzNC45MzY0TDQ3LjUwMzUgMzUuOTIyMkg0OC4xMTA2VjM1LjM1ODlMNDguNjE2NiAyOC42OTMzTDQ5LjUyNzMgMjAuNTI1Nkw1MC40MzggMTAuMDEwOEw1MC43NDE1IDcuMDUzNTZMNTIuMjA4OCAzLjQ4NjA1TDU1LjE0MzMgMS41NjE0OEw1Ny40MiAyLjY0MTEyTDU5LjI5MiA1LjMxNjc0TDU5LjAzOSA3LjA1MzU2TDU3LjkyNiAxNC4yODI0TDU1Ljc1MDQgMjUuNTk1Mkw1NC4zMzM3IDMzLjE5OTZINTUuMTQzM0w1Ni4xMDQ2IDMyLjIxMzhMNTkuOTQ5NyAyNy4xNDQyTDY2LjM3NTIgMTkuMDcwNEw2OS4yMDg1IDE1Ljg3ODRMNzIuNTQ3OCAxMi4zNTc5TDc0LjY3MjggMTAuNjY4SDc4LjcyMDNMODEuNjU0OCAxNS4wODA0TDgwLjMzOTQgMTkuNjMzN0w3Ni4xOTA2IDI0Ljg5MTFMNzIuNzUwMiAyOS4zNTA0TDY3LjgxNzIgMzUuOTU5NUw2NC43NTYyIDQxLjI3MzRMNjUuMDMwNyA0MS43MTE4TDY1Ljc2ODEgNDEuNjQ4OUw3Ni44OTg5IDM5LjI1NUw4Mi45MTk3IDM4LjE3NTNMOTAuMTA0MSAzNi45NTQ5TDkzLjM0MjIgMzguNDU3TDkzLjY5NjMgNDAuMDA2TDkyLjQzMTUgNDMuMTUxTDg0Ljc0MTEgNDUuMDI4N0w3NS43MzUzIDQ2Ljg1OTRMNjIuMzI0NCA1MC4wMTY0TDYyLjE3NTkgNTAuMTM1OEw2Mi4zNTEyIDUwLjM5NThMNjguMzk5IDUwLjk0MzJMNzAuOTc5NCA1MS4wODRINzcuMzAzN0w4OS4wOTIyIDUxLjk3NTlMOTIuMTc4NSA1My45OTQ0TDkzLjk5OTkgNTYuNDgyMkw5My42OTYzIDU4LjQwNjhMODguOTQwNCA2MC44MDA4TDgyLjU2NTUgNTkuMjk4N0w2Ny42NDAxIDU1LjczMTJMNjIuNTMwMSA1NC40NjM4SDYxLjgyMTdWNTQuODg2Mkw2Ni4wNzE3IDU5LjA2NEw3My45MTM5IDY2LjEwNTFMODMuNjc4NiA3NS4yMTE2TDg0LjE4NDUgNzcuNDY0OEw4Mi45MTk3IDc5LjI0ODVMODEuNjA0MiA3OS4wNjA4TDczLjAwMzIgNzIuNTgyOUw2OS42NjM5IDY5LjY3MjZMNjIuMTc1OSA2My4zMzU2SDYxLjY3VjYzLjk5MjhMNjMuMzkwMiA2Ni41Mjc2TDcyLjU0NzggODAuMjgxMkw3My4wMDMyIDg0LjUwNTlMNzIuMzQ1NCA4NS44NjcyTDY5Ljk2NzUgODYuNzEyMUw2Ny4zODcxIDg2LjI0MjdMNjEuOTczNSA3OC42ODUyTDU2LjQ1ODcgNzAuMjM1OUw1Mi4wMDY0IDYyLjYzMTVMNTEuNDY4NyA2Mi45NzFMNDguODE4OSA5MS4yNjU0TDQ3LjYwNDcgOTIuNzIwNkw0NC43NzE0IDkzLjgwMDJMNDIuMzkzNCA5Mi4wMTY0TDQxLjEyODYgODkuMTA2MUw0Mi4zOTM0IDgzLjMzMjRMNDMuOTExMyA3NS44MjE5TDQ1LjEyNTUgNjkuODYwNEw0Ni4yMzg2IDYyLjQ0MzdMNDYuOTE4NCA1OS45NjYxTDQ2Ljg1ODMgNTkuODAwM0w0Ni4zMTUzIDU5Ljg5MTZMNDAuNzIzOCA2Ny41NjAzTDMyLjIyMzkgNzkuMDYwOEwyNS40OTQ4IDg2LjI0MjdMMjMuODc1OCA4Ni44OTk5TDIxLjA5MzEgODUuNDQ0N0wyMS4zNDYxIDgyLjg2M0wyMi45MTQ1IDgwLjU2MjlMMzIuMjIzOSA2OC43MzM4TDM3LjgzOTkgNjEuMzY0MUw0MS40NTk0IDU3LjEzMzdMNDEuNDI0MiA1Ni41MjE4TDQxLjIyNDQgNTYuNTA0OEwxNi40ODkgNzIuNjI5OUwxMi4wODczIDczLjE5MzJMMTAuMTY0NyA3MS40MDk0TDEwLjQxNzYgNjguNDk5MUwxMS4zMjgzIDY3LjU2MDNMMTguNzY1NyA2Mi40NDM3WiIgZmlsbD0iI0Q5Nzc1NyIvPgo8L3N2Zz4K',
      CLAUDE_CODE_LOCKUP: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAxNDU1MiAyMDAwIj4KICA8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMzAuMS4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogMi4xLjEgQnVpbGQgMTM2KSAgLS0+CiAgPGRlZnM+CiAgICA8c3R5bGU+CiAgICAgIC5zdDAgewogICAgICAgIGZpbGw6ICNkOTc3NTc7CiAgICAgIH0KCiAgICAgIC5zdDEgewogICAgICAgIGZpbGw6ICMxNTE1MTQ7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxnPgogICAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTE0NDcyLjQsMTM1MmMtNDUuNCw3OS4zLTk1LjcsMTM3LTE1MSwxNzMtNTUuNCwzNi0xMjEuNyw1NC0xOTksNTRzLTEyNy0xNy43LTE3OS01M2MtNTEuNC0zNS4zLTkxLjQtODUtMTIwLTE0OS0xMy41LTMwLjktMjMuOC02NC4xLTMwLjgtOTkuNmw3MTYuOC0yMjUuNGMtMTQuNy03MC43LTQyLjctMTMyLjMtODQtMTg1LTQxLjQtNTIuNy05Mi43LTkzLjMtMTU0LTEyMi02MC43LTI5LjMtMTI3LjctNDQtMjAxLTQ0cy0xODUuNCwyNC0yNjQsNzJjLTc4LjcsNDcuMy0xNDAuNCwxMTMtMTg1LDE5Ny00NC43LDgzLjMtNjcsMTc2LjctNjcsMjgwczIxLjYsMTkwLDY1LDI3MGM0NCw3OS4zLDEwNC42LDE0MS43LDE4MiwxODcsNzcuMyw0NC43LDE2NC42LDY3LDI2Miw2N3MxNTctMTYuMywyMjUtNDljNjguNi0zMi43LDEyNS42LTc5LDE3MS0xMzksNDUuMy02MCw3NS42LTEyOS43LDkxLTIwOWwtNzgtMjVaTTEzODEwLjQsOTcyYzIwLTUzLjMsNDgtOTQuMyw4NC0xMjMsMzYtMjkuMyw3OC00NCwxMjYtNDRzNzgsMTEsMTEyLDMzYzM0LjYsMjIsNjMuMyw1Mi43LDg2LDkyLDE1LjYsMjcuMSwyNy4zLDU3LDM1LDg5LjVsLTQ3MS44LDE1NC4yYy0uMS01LjgtLjItMTEuNy0uMi0xNy43LDAtNzAsOS42LTEzMS4zLDI5LTE4NFoiLz4KICAgIDxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0xMzM0NiwxNTM2Yy05LjMtMTQtMTQtMzIuNy0xNC01NlYyMzBoLTc5bC0zMTQsMTE3djY4bDE1NSw1Ny44djI3NGMtNy41LTMtMTUuMi01LjktMjMtOC43LTY2LjYtMjQuNy0xMzUuMy0zNy0yMDYtMzctMTE0LjYsMC0yMTYuNiwyNC43LTMwNiw3NC04OC42LDQ4LjctMTU4LDExOC0yMDgsMjA4LTQ5LjMsOTAtNzQsMTk0LTc0LDMxMnMyMC40LDE3Mi4zLDYxLDI0NWM0MS40LDcyLDk4LDEyOC4zLDE3MCwxNjlzMTUyLjQsNjEsMjQxLDYxLDExOC43LTEyLDE3Ni0zNmM1OC0yNCwxMTEuNC01OC4zLDE2MC0xMDMsMy0yLjcsNi01LjUsOS04LjN2MTM3LjNoODBsMzE0LTg0di04NmMtNDAtNS4zLTcxLjMtMTItOTQtMjAtMjItOC43LTM4LTIwLTQ4LTM0Wk0xMjk3MSwxNTg0Yy00My4zLDE2LjctODQuNiwyNS0xMjQsMjUtNjYsMC0xMjMuMy0xNC43LTE3Mi00NC00OC0zMC04NS03My0xMTEtMTI5LTI2LTU2LjctMzktMTI0LjctMzktMjA0czE0LjQtMTU5LjMsNDMtMjIyYzI5LjQtNjIuNyw3MC43LTExMC43LDEyNC0xNDQsNTQtMzQsMTE2LjctNTEsMTg4LTUxczExOCwxNiwxNjgsNDhjMTUsOS4zLDMwLjMsMjAuNSw0NiwzMy42djYxOC40Yy0zOC42LDI5LjMtNzkuNiw1Mi4zLTEyMyw2OVoiLz4KICAgIDxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0xMTkwOC42LDc2N2MtODAuNi00NC0xNzItNjYtMjc0LTY2cy0xOTIsMjUtMjc2LDc1Yy04NCw0OS4zLTE1MC42LDExNi43LTIwMCwyMDItNDguNiw4NC43LTczLDE3Ny4zLTczLDI3OHMyMi43LDE4Nyw2OCwyNjVjNDYsNzgsMTA5LjQsMTM5LDE5MCwxODMsODEuNCw0NCwxNzMsNjYsMjc1LDY2czE5Mi0yNC43LDI3Ni03NGM4NC01MCwxNTAuNC0xMTcuMywxOTktMjAyLDQ5LjQtODUuMyw3NC0xNzguMyw3NC0yNzlzLTIzLTE4Ni02OS0yNjRjLTQ1LjMtNzguNy0xMDguNi0xNDAtMTkwLTE4NFpNMTE4ODYuNiwxNDgxYy0yMiw2MC01NCwxMDYtOTYsMTM4LTQyLDMxLjMtOTEuNiw0Ny0xNDksNDdzLTExMS42LTE5LjctMTU5LTU5Yy00Ni42LTM5LjMtODMuMy05My43LTExMC0xNjMtMjYuNi03MC00MC0xNDkuMy00MC0yMzhzMTEtMTU1LDMzLTIxNWMyMi43LTYwLDU0LjctMTA1LjcsOTYtMTM3LDQyLTMyLDkxLjctNDgsMTQ5LTQ4czExMy40LDE5LjcsMTYwLDU5YzQ3LjQsMzguNyw4NCw5MywxMTAsMTYzLDI2LjcsNzAsNDAsMTQ5LjMsNDAsMjM4cy0xMS4zLDE1NS0zNCwyMTVaIi8+CiAgICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTA3NjMuMywxNDk5Yy00NCw1Ni05NCw5Ny0xNTAsMTIzLTU1LjMsMjYtMTE5LjYsMzktMTkzLDM5LTExNCwwLTIxMy42LTI3LjMtMjk5LTgyLTg1LjMtNTQuNy0xNTEuMy0xMzIuNy0xOTgtMjM0LTQ2LjctMTAxLjMtNzAtMjE5LjctNzAtMzU1czIxLTI1NS43LDYzLTM1M2M0Mi43LTk3LjMsMTA0LjQtMTcxLjMsMTg1LTIyMiw4MS40LTUwLjcsMTc5LjQtNzYsMjk0LTc2czE2MiwxMi4zLDIyMiwzN2M2MC43LDI0LDEwOS40LDYxLjMsMTQ2LDExMiwzNy40LDUwLjcsNjUsMTE2LDgzLDE5Nmg5MHYtMzI5Yy02Ni0zOS4zLTE0Ni4zLTcwLTI0MS05Mi05NC0yMi0xOTIuNi0zMy0yOTYtMzMtMTU5LjMsMC0zMDEuMywzNC00MjYsMTAyLTEyNC43LDY3LjMtMjIyLDE2MS43LTI5MiwyODMtNzAsMTIwLjctMTA1LDI1OC0xMDUsNDEyczM0LDI3NC4zLDEwMiwzODdjNjgsMTEyLDE2My4zLDE5OS4zLDI4NiwyNjJzMjYyLjcsOTQsNDIwLDk0LDIwMC40LTExLjcsMjk1LTM1Yzk0LjctMjQsMTc0LjctNTYuNywyNDAtOThsNjQtMzYxaC05NGMtMzkuMyw5Mi43LTgxLjMsMTY3LTEyNiwyMjNaIi8+CiAgICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNNDI5OS43LDE2MTNjLTEwLTEzLjMtMTUtMzAuMy0xNS01MVYyMzBoLTgwbC0zMTQsMTE3djY3bDE1Niw1OXYxMDg5YzAsMjAuNy01LDM3LjctMTUsNTFzLTI2LjMsMjQtNDksMzJjLTIyLDcuMy01Mi43LDEzLjMtOTIsMTh2ODdoNTUwdi04N2MtMzkuMy00LjctNzAuMy0xMC43LTkzLTE4LTIyLTgtMzgtMTguNy00OC0zMloiLz4KICAgIDxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0zNTk1LjcsMTQ4MmMtNDAsNTUuMy04OS4zLDk5LTE0OCwxMzEtNTgsMzItMTI3LjcsNDgtMjA5LDQ4LTEyMCwwLTIyMi43LTI5LjMtMzA4LTg4LTg1LjMtNTguNy0xNDkuNy0xMzguNy0xOTMtMjQwLTQzLjMtMTAxLjMtNjUtMjE1LjctNjUtMzQzczE5LjMtMjQyLjcsNTgtMzQwYzM4LjctOTgsOTguMy0xNzQuMywxNzktMjI5LDgwLjctNTQuNywxODItODIsMzA0LTgyczIyNy43LDI3LjMsMzAxLDgyYzc0LDU0LjcsMTIzLjcsMTQyLjMsMTQ5LDI2M2g5MHYtMzI5Yy03Mi00Mi43LTE1NS43LTc0LTI1MS05NC05NC43LTIwLjctMTg5LjctMzEtMjg1LTMxLTE1OC43LDAtMzAwLjMsMzMuNy00MjUsMTAxLTEyNC43LDY2LjctMjIyLjMsMTYwLjMtMjkzLDI4MS03MCwxMjAuNy0xMDUsMjU4LjctMTA1LDQxNHMzNC4zLDI3NS4zLDEwMywzODhjNjguNywxMTIuNywxNjQsMjAwLjMsMjg2LDI2MywxMjIuNyw2MiwyNjIuMyw5Myw0MTksOTNzMTkxLTExLDI4Ny0zMywxNzguNy01NS4zLDI0OC0xMDBsNjQtMzYxaC05NGMtMzQuNyw4MS4zLTcyLDE1MC0xMTIsMjA2WiIvPgogICAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTY2NTkuNywxNTM2Yy05LjMtMTQtMTQtMzIuNy0xNC01NnYtNzc5aC03OWwtMzE1LDExMXY2N2wxNTYsNTV2NTUzYy00Mi43LDM0LTg4LjcsNjAuNy0xMzgsODAtNDguNywxOS4zLTk0LjMsMjktMTM3LDI5LTY2LjcsMC0xMTYtMTUuMy0xNDgtNDZzLTQ4LTc3LjctNDgtMTQxdi03MDhoLTc5bC0zMTUsMTExdjY3bDE1Niw1NXY1MTZjMCwxMDQuNywyNy43LDE4NC4zLDgzLDIzOSw1NS4zLDU0LDEzNi4zLDgxLDI0Myw4MXMxMjgtMTYuNywxOTYtNTBjNjguNy0zMy4zLDEzMS03OSwxODctMTM3djE3N2g3OWwzMTUtODR2LTg3Yy00MC43LTUuMy03Mi0xMi05NC0yMHMtMzgtMTktNDgtMzNaIi8+CiAgICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNODkyMy43LDE1MTVjLTU4LDM0LjctMTIzLjcsNTItMTk3LDUycy0xNjEtMjQuNy0yMjEtNzRjLTU5LjMtNTAtOTktMTE5LTExOS0yMDdsNzI2LTIyMGMtMTQtNzEuMy00Mi43LTEzNC43LTg2LTE5MC00Mi43LTU1LjMtOTUuNy05OC4zLTE1OS0xMjktNjMuMy0zMC43LTEzMS43LTQ2LTIwNS00NnMtMTg0LjcsMjQtMjY0LDcyYy03OC43LDQ4LTE0MC43LDExMy43LTE4NiwxOTctNDUuMyw4My4zLTY4LDE3NS43LTY4LDI3N3MyMiwxOTAsNjYsMjcwYzQ0LjcsNzkuMywxMDYuMywxNDEuMywxODUsMTg2LDc4LjcsNDQuNywxNjcsNjcsMjY1LDY3czE1NS0xNiwyMjMtNDgsMTI1LjMtNzcuMywxNzItMTM2YzQ3LjMtNTkuMyw4MC4zLTEyOC4zLDk5LTIwN2wtNzctMjRjLTQ0LjcsNzEuMy05NiwxMjQuNy0xNTQsMTYwWk04MzcyLjcsMTE1OWMwLTY4LjcsMTAuNy0xMjksMzItMTgxLDIxLjMtNTIuNyw1MS05My4zLDg5LTEyMnM4MS4zLTQzLDEzMC00Myw3My43LDkuMywxMDUsMjhjMzEuMywxOCw1Ny4zLDQ0LDc4LDc4LDIxLjMsMzMuMywzNi43LDcyLjMsNDYsMTE3bC00NzksMTUwYy0uNy02LjctMS0xNS43LTEtMjdaIi8+CiAgICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNNTQxNy43LDE1OTZjLTkuMy0xNC0xNC0zMi43LTE0LTU2di00NzVjMC03Ny4zLTE3LTE0My4zLTUxLTE5OHMtODMuNy05Ni0xNDktMTI0Yy02NS4zLTI4LTE0NC43LTQyLTIzOC00MnMtMTQzLjMsMTEuNy0yMDYsMzVjLTYyLjcsMjMuMy0xMTIuMyw1NS0xNDksOTUtMzYuNywzOS4zLTU1LDgyLjctNTUsMTMwczUsNDYsMTUsNjZjMTAuNywxOS4zLDI1LjcsMzUsNDUsNDdoMTYydi05MGMwLTYwLjcsMTYuNy0xMDguNyw1MC0xNDQsMzQtMzUuMyw4MC01MywxMzgtNTNzMTE1LjcsMTguMywxNDksNTVjMzQsMzYuNyw1MSw5MC43LDUxLDE2MnYxMDlsLTM2MywxMDNjLTk4LDI4LTE3MC43LDY2LjMtMjE4LDExNS00Ni43LDQ4LTcwLDEwOS03MCwxODNzMTIsOTUuMywzNiwxMzRjMjQuNywzOC43LDU5LDY4LjcsMTAzLDkwczk0LjcsMzIsMTUyLDMyLDEzNy4zLTE1LDE5OC00NWM2MC43LTMwLjcsMTE1LjMtNzYsMTY0LTEzNiw3LjMsNTcuMywzMC4zLDEwMS4zLDY5LDEzMiwzOS4zLDMwLjcsOTEuMyw0NiwxNTYsNDZzMTA5LTEwLjMsMTY3LTMxdi04N2MtNDAtNC43LTcxLjMtMTEtOTQtMTktMjItOC43LTM4LTIwLTQ4LTM0Wk01MTY1LjcsMTQ5NGMtMzQuNywzNi43LTczLjMsNjUuMy0xMTYsODYtNDIsMjAtODQuMywzMC0xMjcsMzBzLTYzLjMtNi4zLTkwLTE5Yy0yNi0xMi43LTQ2LjMtMzAuMy02MS01My0xNC43LTIyLjctMjItNDguNy0yMi03OCwwLTQyLjcsMTIuMy03OC43LDM3LTEwOCwyNC43LTMwLDYwLjMtNTIsMTA3LTY2bDI3Mi04MXYyODlaIi8+CiAgICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNNzkzNi43LDE1MzZjLTkuMy0xNC0xNC0zMi43LTE0LTU2VjIzMGgtODBsLTMxNCwxMTd2NjdsMTU2LDU5djI3NGMtMzUuMy0xNC43LTczLTI2LTExMy0zNC0zOS4zLTgtNzgtMTItMTE2LTEyLTExNi43LDAtMjE5LjMsMjQuNy0zMDgsNzQtODguNyw0OS4zLTE1Ny43LDExOS0yMDcsMjA5LTQ4LjcsOTAtNzMsMTkzLjctNzMsMzExczIwLjMsMTcxLjMsNjEsMjQ0YzQwLjcsNzIsOTYuNywxMjguNywxNjgsMTcwLDcyLDQwLjcsMTUzLDYxLDI0Myw2MXMxMjEuNy0xMi43LDE4MS0zOGM1OS4zLTI1LjMsMTE0LTYxLjcsMTY0LTEwOXYxMzdoNzlsMzE1LTg0di04N2MtNDAuNy01LjMtNzItMTItOTQtMjBzLTM4LTE5LTQ4LTMzWk03Njg0LjcsMTUxNGMtMzgsMjkuMy03OC43LDUyLjctMTIyLDcwLTQzLjMsMTYuNy04NSwyNS0xMjUsMjUtNzAsMC0xMjkuMy0xNS43LTE3OC00Ny00OC0zMi04NC03Ni4zLTEwOC0xMzNzLTM2LTEyMi43LTM2LTE5OCwxMy4zLTE1MC4zLDQwLTIxM2MyNy4zLTYyLjcsNjcuNy0xMTIsMTIxLTE0OCw1My4zLTM2LDExOC01NCwxOTQtNTRzMTQ4LjcsMjYuNywyMTQsODB2NjE4WiIvPgogIDwvZz4KICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNODcwLDE5MDBsMjgtMTI0LDMyLTE2MCwyNi0xMjgsMjQtMTU4LDE0LTUyLTItNC0xMCwyLTEyMCwxNjQtMTgyLDI0Ni0xNDQsMTUyLTM0LDE0LTYwLTMwLDYtNTYsMzQtNDgsMTk4LTI1NCwxMjAtMTU4LDc4LTkwLTItMTJoLTRsLTUyOCwzNDQtOTQsMTItNDItMzgsNi02MiwyMC0yMCwxNTgtMTEwLDM5NC0yMjAsNi0yMC02LTEwaC0yMGwtNjYtNC0yMjQtNi0xOTQtOC0xOTAtMTAtNDgtMTBMMCw5ODJsNC0zMCw0MC0yNiw1OCw0LDEyNiwxMCwxOTAsMTIsMTM4LDgsMjA0LDIyaDMybDQtMTQtMTAtOC04LTgtMTk4LTEzMi0yMTItMTQwLTExMi04Mi02MC00Mi0zMC0zOC0xMi04NCw1NC02MCw3NCw2LDE4LDQsNzQsNTgsMTU4LDEyMiwyMDgsMTU0LDMwLDI0LDE0LTh2LTZsLTE0LTIyLTExMi0yMDQtMTIwLTIwOC01NC04Ni0xNC01MmMtNS4zLTE4LTgtMzgtOC02MGw2Mi04NCwzNC0xMiw4NCwxMiwzNCwzMCw1MiwxMTgsODIsMTg2LDEzMCwyNTIsMzgsNzYsMjAsNjgsOCwyMmgxNHYtMTJsMTAtMTQ0LDIwLTE3NCwyMC0yMjQsNi02NCwzMi03Niw2Mi00MCw0OCwyMiw0MCw1OC02LDM2LTIyLDE1NC00OCwyNDItMzAsMTY0aDE4bDIwLTIyLDgyLTEwOCwxMzgtMTcyLDYwLTY4LDcyLTc2LDQ2LTM2aDg2bDYyLDk0LTI4LDk4LTg4LDExMi03NCw5NC0xMDYsMTQyLTY0LDExNCw2LDhoMTRsMjM4LTUyLDEzMC0yMiwxNTItMjYsNzAsMzIsOCwzMi0yOCw2OC0xNjQsNDAtMTkyLDM4LTI4Niw2OC00LDIsNCw2LDEyOCwxMiw1Niw0aDEzNmwyNTIsMTgsNjYsNDQsMzgsNTItNiw0Mi0xMDIsNTAtMTM2LTMyLTMyMC03Ni0xMDgtMjZoLTE2djhsOTIsOTAsMTY2LDE1MCwyMTAsMTk0LDEwLDQ4LTI2LDQwLTI4LTQtMTg0LTE0MC03Mi02Mi0xNjAtMTM0aC0xMHYxNGwzNiw1NCwxOTYsMjk0LDEwLDkwLTE0LDI4LTUyLDE4LTU0LTEwLTExNi0xNjAtMTE4LTE4Mi05Ni0xNjItMTAsOC01OCw2MDQtMjYsMzAtNjAsMjQtNTAtMzgtMjgtNjJaIi8+Cjwvc3ZnPg==',
      CODEX_APP_ICON: 'data:image/png;base64,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',
    }
    // <<< preset-assets

    /**
     * One-click brand presets. Every preset names all five stored keys, so
     * applying one replaces the previous configuration outright; the artwork is
     * embedded, so a preset needs no file picking and no network.
     */
    const PRESETS = [
      {
        id: 'claude',
        values: {
          mark: PRESET_ASSETS.CLAUDE_SPARK,
          wordmark: PRESET_ASSETS.CLAUDE_CODE_LOCKUP,
          name: '',
          badge: 'ANTHROP\\C',
          hideMark: true,
          hideBrand: false,
        },
      },
      {
        id: 'codex',
        values: {
          mark: PRESET_ASSETS.CODEX_APP_ICON,
          wordmark: '',
          name: 'Codex',
          badge: 'OPENAI',
          hideMark: false,
          hideBrand: false,
        },
      },
      {
        id: 'none',
        values: {
          mark: '',
          wordmark: '',
          name: '',
          badge: '',
          hideMark: false,
          hideBrand: true,
        },
      },
    ]

    /** Copy shared with the Settings page's own stylesheet. */
    const PAGE_CSS = [
      '.sl-page{display:flex;flex-direction:column;gap:22px;padding:0 0 8px;}',
      '.sl-intro{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);}',
      '.sl-field{display:flex;flex-direction:column;gap:7px;}',
      '.sl-label{font-size:13px;font-weight:500;line-height:18px;color:var(--dsw-alias-label-primary);}',
      '.sl-desc{margin:0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-tertiary);}',
      '.sl-input{box-sizing:border-box;width:100%;height:34px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:32px;outline:none;}',
      '.sl-input::placeholder{color:var(--dsw-alias-label-tertiary);}',
      '.sl-input:focus-visible{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary);}',
      '.sl-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}',
      '.sl-preview{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;overflow:hidden;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-3);}',
      '.sl-preview img{display:block;width:24px;height:24px;object-fit:contain;}',
      '.sl-preview-wide{width:140px;padding:0 8px;}',
      '.sl-preview-wide img{width:auto;max-width:100%;height:22px;}',
      '.sl-empty{font-size:12px;line-height:15px;color:var(--dsw-alias-label-tertiary);}',
      '.sl-btn{height:32px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:12px;cursor:pointer;}',
      '.sl-btn:not([disabled]):hover{border-color:var(--dsw-alias-border-l3);}',
      '.sl-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}',
      '.sl-btn[disabled]{opacity:.45;cursor:default;}',
      '.sl-btn-quiet{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary);}',
      '.sl-btn-quiet:not([disabled]):hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);}',
      '.sl-btn-active{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}',
      '.sl-strip{display:flex;align-items:center;gap:5px;height:24px;}',
      '.sl-follow{display:flex;align-items:center;min-height:44px;padding:9px 12px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-specific-sidebar-fill);}',
      '.sl-foot{display:flex;align-items:center;gap:12px;padding-top:2px;flex-wrap:wrap;}',
      '.sl-switch{display:flex;align-items:flex-start;gap:9px;cursor:pointer;}',
      '.sl-switch input[type=checkbox]{margin:2px 0 0;width:15px;height:15px;flex:none;accent-color:var(--dsw-alias-brand-primary);cursor:pointer;}',
      '.sl-switch-body{display:flex;flex-direction:column;gap:3px;}',
      '.sl-note{margin:0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-tertiary);}',
      '.sl-error{margin:0;font-size:12px;line-height:17px;color:var(--dsw-alias-state-error-primary);}',
      '.sl-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}',
    ].join('')

    /** localStorage presence is not guaranteed in every embedding. */
    function readStored() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
        const next = {}
        for (const field of FIELDS) {
          const candidate = parsed[field]
          if (typeof candidate !== 'string') continue
          // Trimmed on read as well as on commit, so a hand-edited or padded
          // value can never occupy a brand cell with invisible text.
          const value = candidate.trim()
          if (value !== '') next[field] = value
        }
        if (parsed[HIDE_MARK] === true) next[HIDE_MARK] = true
        if (parsed[HIDE_BRAND] === true) next[HIDE_BRAND] = true
        return next
      } catch {
        return {}
      }
    }

    /**
     * @param {Record<string, string>} value - complete logo settings.
     * @returns whether the browser accepted the write.
     */
    function writeStored(value) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
        return true
      } catch {
        // A full or blocked storage keeps the in-memory value for this page;
        // the caller surfaces the refusal instead of claiming it was saved.
        return false
      }
    }

    /**
     * @param {Record<string, string | boolean>} a - logo settings.
     * @param {Record<string, string | boolean>} b - logo settings.
     * @returns whether both hold the same fields, in any key order.
     */
    function sameLogo(a, b) {
      for (const field of FIELDS) {
        if ((a[field] || '') !== (b[field] || '')) return false
      }
      return (a[HIDE_MARK] === true) === (b[HIDE_MARK] === true)
        && (a[HIDE_BRAND] === true) === (b[HIDE_BRAND] === true)
    }

    /**
     * Snapshot store over the stored logo settings; `getSnapshot` keeps one
     * reference until the next write, which is what useSyncExternalStore needs.
     */
    function createLogoStore() {
      let value = readStored()
      const listeners = new Set()
      const publish = () => {
        for (const listener of [...listeners]) {
          try {
            listener()
          } catch (error) {
            console.error('[sidebar-logo] subscriber failed', error)
          }
        }
      }
      const commit = (next) => {
        value = next
        const saved = writeStored(value)
        publish()
        return saved
      }
      return {
        getSnapshot: () => value,
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
        /**
         * @param {Record<string, string>} patch - fields to replace.
         * @returns whether the browser accepted the write.
         */
        set(patch) {
          return commit({ ...value, ...patch })
        },
        /**
         * Drop every stored field, restoring the shipped logo.
         * @returns whether the browser accepted the write.
         */
        reset() {
          if (sameLogo(value, {})) return true
          return commit({})
        },
        /** Adopt another tab's write. */
        rehydrate() {
          const next = readStored()
          if (sameLogo(value, next)) return
          value = next
          publish()
        },
      }
    }

    /** Read a file as a data URL. */
    function readAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new window.FileReader()
        reader.onload = () => {
          const result = reader.result
          if (typeof result !== 'string' || result === '') reject(new Error('unreadable'))
          else resolve(result)
        }
        reader.onerror = () => reject(new Error('unreadable'))
        reader.onabort = () => reject(new Error('unreadable'))
        reader.readAsDataURL(file)
      })
    }

    /**
     * Decode a data URL, place it on a canvas, and return the encoded result.
     * @param {string} source - data URL of the picked file.
     * @param {(width: number, height: number) => { width: number, height: number }} fit - canvas geometry.
     */
    function rasterize(source, fit) {
      return new Promise((resolve, reject) => {
        const image = new window.Image()
        image.onload = () => {
          try {
            const naturalWidth = image.naturalWidth || image.width
            const naturalHeight = image.naturalHeight || image.height
            const size = fit(naturalWidth || 1, naturalHeight || 1)
            if (!naturalWidth || !naturalHeight) {
              // No intrinsic size to scale from (some viewBox-only SVGs): keep
              // the bytes, but only within the embedded-image budget.
              if (source.length > MAX_EMBEDDED_BYTES) reject(new Error('too-large'))
              else resolve(source)
              return
            }
            const canvas = document.createElement('canvas')
            canvas.width = size.width
            canvas.height = size.height
            const context = canvas.getContext('2d')
            if (context === null) {
              if (source.length > MAX_EMBEDDED_BYTES) reject(new Error('too-large'))
              else resolve(source)
              return
            }
            context.clearRect(0, 0, size.width, size.height)
            const scale = Math.min(size.width / naturalWidth, size.height / naturalHeight)
            const drawWidth = Math.max(1, Math.round(naturalWidth * scale))
            const drawHeight = Math.max(1, Math.round(naturalHeight * scale))
            context.drawImage(
              image,
              Math.round((size.width - drawWidth) / 2),
              Math.round((size.height - drawHeight) / 2),
              drawWidth,
              drawHeight,
            )
            resolve(canvas.toDataURL('image/png'))
          } catch (error) {
            reject(error)
          }
        }
        image.onerror = () => reject(new Error('unreadable'))
        image.src = source
      })
    }

    /**
     * Decode a data URL once, so a corrupt file is rejected before it is stored.
     * @param {string} source - data URL to decode.
     */
    function probeImage(source) {
      return new Promise((resolve, reject) => {
        const image = new window.Image()
        image.onload = () => { resolve() }
        image.onerror = () => { reject(new Error('unreadable')) }
        image.src = source
      })
    }

    /**
     * @param {File} file - picked file.
     * @returns whether the file is an SVG, by MIME type or by extension.
     */
    function isSvgFile(file) {
      if (file.type === 'image/svg+xml') return true
      return /\.svgz?$/i.test(file.name || '')
    }

    /**
     * Normalize a picked mark file: SVGs stay vector, rasters shrink to a
     * 96 px square with the artwork contained, never cropped.
     * @param {File} file - picked file.
     */
    async function readMarkFile(file) {
      if (isSvgFile(file)) {
        if (file.size > MAX_EMBEDDED_BYTES) throw new Error('too-large')
        const source = await readAsDataUrl(file)
        await probeImage(source)
        return source
      }
      const source = await readAsDataUrl(file)
      return await rasterize(source, () => ({ width: MARK_EDGE, height: MARK_EDGE }))
    }

    /**
     * Normalize a picked wordmark file: height leads, width keeps its ratio up
     * to a sane maximum for a wide logo.
     * @param {File} file - picked file.
     */
    async function readWordmarkFile(file) {
      if (isSvgFile(file)) {
        if (file.size > MAX_EMBEDDED_BYTES) throw new Error('too-large')
        const source = await readAsDataUrl(file)
        await probeImage(source)
        return source
      }
      const source = await readAsDataUrl(file)
      return await rasterize(source, (width, height) => {
        const scale = Math.min(WORDMARK_HEIGHT / height, WORDMARK_MAX_WIDTH / width)
        return {
          width: Math.max(1, Math.round(width * scale)),
          height: Math.max(1, Math.round(height * scale)),
        }
      })
    }

    /**
     * Build the two brand occupants. Both read the shared store, so any write
     * from the Settings page re-renders the sidebar immediately.
     * @param {ReturnType<typeof createLogoStore>} store - logo settings.
     */
    function createBrandComponents(store) {
      const useLogo = () => useSyncExternalStore(store.subscribe, store.getSnapshot)

      /** The element the "no logo" rules key on; it must stay in the tree, so it is hidden, not omitted. */
      function hiddenMarker(key) {
        return h('span', { key, 'data-dsh-logo-hidden': '', 'aria-hidden': true, style: { display: 'none' } })
      }

      /**
       * Square mark: the shipped slot hands over the edge length it wants.
       * Also serves the "hide the mark cell" preference, which keeps the cell
       * occupied but paints nothing — that is what lets a self-contained
       * wordmark stand alone without the shipped whale beside it.
       * @param {{ size?: number }} props - sidebar-supplied geometry.
       */
      function BrandMark(props) {
        const logo = useLogo()
        if (logo[HIDE_BRAND] === true) return hiddenMarker('hidden')
        if (logo[HIDE_MARK] === true || !logo.mark) return null
        const size = typeof props.size === 'number' && props.size > 0 ? props.size : 24
        return h('img', {
          src: logo.mark,
          alt: '',
          draggable: false,
          'aria-hidden': true,
          style: {
            display: 'block',
            width: size + 'px',
            height: size + 'px',
            objectFit: 'contain',
          },
        })
      }

      /** Name cell: a wide wordmark image, the name text, and the badge tag. */
      function BrandName() {
        const logo = useLogo()
        // The name cell only exists while the sidebar is expanded, so the layout
        // rules ride here: the collapsed rail keeps its expand button.
        if (logo[HIDE_BRAND] === true) {
          return [h('style', { key: 'rule' }, HIDDEN_RULES), hiddenMarker('hidden')]
        }
        const parts = []
        if (logo.wordmark) {
          parts.push(h('img', {
            key: 'wordmark',
            src: logo.wordmark,
            alt: '',
            draggable: false,
            'aria-hidden': true,
            style: {
              display: 'block',
              height: '22px',
              width: 'auto',
              maxWidth: '190px',
              objectFit: 'contain',
            },
          }))
        } else if (logo.name) {
          parts.push(h('span', {
            key: 'name',
            style: {
              fontSize: '17px',
              fontWeight: 600,
              lineHeight: '24px',
              letterSpacing: '0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'var(--dsw-alias-label-primary)',
            },
          }, logo.name))
        }
        if (logo.badge) {
          parts.push(h('span', {
            key: 'badge',
            style: {
              flex: 'none',
              maxWidth: '140px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '10px',
              fontWeight: 600,
              lineHeight: '14px',
              letterSpacing: '0.08em',
              padding: '1px 5px',
              borderRadius: '4px',
              background: 'var(--dsw-alias-label-primary)',
              color: 'var(--dsw-alias-label-primary-inverted)',
              whiteSpace: 'nowrap',
            },
          }, logo.badge))
        }
        if (parts.length === 0) return null
        return h('span', {
          style: { display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0, height: '24px' },
        }, parts)
      }

      return { BrandMark, BrandName }
    }

    /**
     * One text preference. The field keeps its own draft and commits shortly
     * after typing stops, so the sidebar and the preview follow the edit live;
     * blur commits at once, and unmounting flushes anything still pending (the
     * Settings panel can be dismissed with Escape, which never blurs).
     * @param {{ id: string, label: string, description: string, placeholder: string, maxLength: number, value: string, onCommit: (next: string) => void }} props - field face.
     */
    function TextField(props) {
      const [draft, setDraft] = useState(props.value)
      const [editing, setEditing] = useState(false)
      // Latest values for the unmount flush: its cleanup closure is created once.
      const latest = useRef({ draft: props.value, committed: props.value, onCommit: props.onCommit })
      latest.current.draft = draft
      latest.current.committed = props.value
      latest.current.onCommit = props.onCommit
      useEffect(() => {
        if (!editing) setDraft(props.value)
      }, [props.value, editing])
      useEffect(() => {
        if (!editing) return undefined
        const next = draft.trim()
        if (next === props.value) return undefined
        const timer = window.setTimeout(() => { props.onCommit(next) }, 200)
        return () => { window.clearTimeout(timer) }
      }, [draft, editing, props.value, props.onCommit])
      useEffect(() => () => {
        const { draft: pending, committed, onCommit } = latest.current
        const next = pending.trim()
        if (next !== committed) onCommit(next)
      }, [])
      const flush = () => {
        const next = draft.trim()
        setDraft(next)
        if (next !== props.value) props.onCommit(next)
      }
      return h('div', { className: 'sl-field' },
        h('label', { className: 'sl-label', htmlFor: props.id }, props.label),
        h('p', { className: 'sl-desc' }, props.description),
        h('input', {
          id: props.id,
          className: 'sl-input',
          type: 'text',
          value: draft,
          placeholder: props.placeholder,
          maxLength: props.maxLength,
          spellCheck: false,
          autoComplete: 'off',
          onChange: (event) => { setDraft(event.currentTarget.value) },
          onFocus: () => { setEditing(true) },
          onBlur: () => {
            setEditing(false)
            flush()
          },
          onKeyDown: (event) => {
            if (event.nativeEvent && event.nativeEvent.isComposing) return
            // Enter commits but keeps focus here, so the keyboard flow continues
            // in place instead of dropping to the document body.
            if (event.key === 'Enter') flush()
          },
        }),
      )
    }

    /**
     * One image preference: preview, native picker behind a button, and a clear
     * action that stays mounted (so focus is not lost when it empties the field).
     * @param {{ id: string, label: string, description: string, wide: boolean, value: string, emptyLabel: string, chooseLabel: string, clearLabel: string, onPick: (file: File) => void, onClear: () => void }} props - field face.
     */
    function ImageField(props) {
      const input = useRef(null)
      return h('div', { className: 'sl-field' },
        h('div', { className: 'sl-label' }, props.label),
        h('p', { className: 'sl-desc' }, props.description),
        h('div', { className: 'sl-row' },
          h('span', { className: 'sl-preview' + (props.wide ? ' sl-preview-wide' : '') },
            props.value
              ? h('img', { src: props.value, alt: '' })
              : h('span', { className: 'sl-empty' }, props.emptyLabel)),
          h('button', {
            type: 'button',
            className: 'sl-btn',
            'aria-label': props.chooseLabel + ' — ' + props.label,
            onClick: () => {
              const element = input.current
              if (element === null) return
              element.value = ''
              element.click()
            },
          }, props.chooseLabel),
          h('button', {
            type: 'button',
            className: 'sl-btn sl-btn-quiet',
            disabled: props.value === '',
            'aria-label': props.clearLabel + ' — ' + props.label,
            onClick: () => { props.onClear() },
          }, props.clearLabel),
        ),
        h('input', {
          ref: input,
          id: props.id,
          className: 'sl-sr-only',
          type: 'file',
          accept: 'image/*',
          'aria-label': props.label,
          onChange: (event) => {
            const file = event.currentTarget.files && event.currentTarget.files[0]
            event.currentTarget.value = ''
            if (file) props.onPick(file)
          },
        }),
      )
    }

    /**
     * One switch preference.
     * @param {{ id: string, label: string, description: string, checked: boolean, onChange: (next: boolean) => void }} props - field face.
     */
    function CheckField(props) {
      return h('label', { className: 'sl-switch', htmlFor: props.id },
        h('input', {
          id: props.id,
          type: 'checkbox',
          checked: props.checked,
          onChange: (event) => { props.onChange(event.currentTarget.checked) },
        }),
        h('span', { className: 'sl-switch-body' },
          h('span', { className: 'sl-label' }, props.label),
          h('span', { className: 'sl-desc' }, props.description),
        ),
      )
    }

    /**
     * Build the Settings page component once per plugin load.
     * @param {ReturnType<typeof createLogoStore>} store - logo settings.
     * @param {(key: string) => string} translate - bound dictionary lookup.
     * @param {{ BrandMark: Function, BrandName: Function }} brand - occupants reused for the live preview.
     */
    function createLogoPage(store, translate, brand) {
      const useLogo = () => useSyncExternalStore(store.subscribe, store.getSnapshot)

      /** @param {object} props - slot props; `t` arrives from the registered `locale`. */
      function LogoPage(props) {
        const t = props && typeof props.t === 'function' ? props.t : translate
        const logo = useLogo()
        const [problem, setProblem] = useState('')
        // Per-field pick generation: a slow decode must not overwrite a newer pick.
        const picks = useRef({ mark: 0, wordmark: 0 })

        /** Persist one field and report a refusal instead of claiming success. */
        const write = (patch) => {
          const saved = store.set(patch)
          setProblem(saved ? '' : t('error.storage'))
        }

        /** Replace the whole configuration with one preset; every field stays editable after. */
        const applyPreset = (preset) => {
          const saved = store.set({ ...preset.values })
          setProblem(saved ? '' : t('error.storage'))
        }

        const pickFile = (field) => async (file) => {
          const generation = picks.current[field] + 1
          picks.current[field] = generation
          const prefix = field === 'mark' ? t('mark.title') : t('wordmark.title')
          try {
            setProblem('')
            const next = field === 'mark' ? await readMarkFile(file) : await readWordmarkFile(file)
            if (picks.current[field] !== generation) return
            write({ [field]: next })
          } catch (error) {
            if (picks.current[field] !== generation) return
            const reason = error && error.message === 'too-large' ? t('error.tooLarge') : t('error.unreadable')
            setProblem(prefix + ': ' + reason)
          }
        }

        const strip = []
        const hidden = logo[HIDE_BRAND] === true
        if (!hidden && logo.mark && logo[HIDE_MARK] !== true) strip.push(h(brand.BrandMark, { key: 'mark', size: 24 }))
        if (!hidden && (logo.wordmark || logo.name || logo.badge)) strip.push(h(brand.BrandName, { key: 'name' }))
        const configured = strip.length > 0 || hidden || logo[HIDE_MARK] === true

        return h('div', { className: 'sl-page' },
          h('style', { key: 'css' }, PAGE_CSS),
          h('p', { className: 'sl-intro' }, t('intro')),

          h('div', { className: 'sl-field' },
            h('div', { className: 'sl-label' }, t('presets.title')),
            h('p', { className: 'sl-desc' }, t('presets.desc')),
            h('div', { className: 'sl-row' },
              PRESETS.map(preset => {
                const active = sameLogo(logo, preset.values)
                return h('button', {
                  key: preset.id,
                  type: 'button',
                  className: 'sl-btn' + (active ? ' sl-btn-active' : ''),
                  'aria-pressed': active,
                  onClick: () => { applyPreset(preset) },
                }, t('presets.' + preset.id))
              }),
            ),
          ),

          h('div', { className: 'sl-field' },
            h('div', { className: 'sl-label' }, t('preview.label')),
            h('div', { className: 'sl-follow' },
              h('span', { className: 'sl-strip' },
                configured ? strip : h('span', { className: 'sl-empty' }, t('preview.empty')),
              ),
            ),
          ),

          h(ImageField, {
            key: 'mark',
            id: 'sl-field-mark',
            label: t('mark.title'),
            description: t('mark.desc'),
            wide: false,
            value: logo.mark || '',
            emptyLabel: t('empty'),
            chooseLabel: t('choose'),
            clearLabel: t('clear'),
            onPick: pickFile('mark'),
            onClear: () => { write({ mark: '' }) },
          }),
          h(ImageField, {
            key: 'wordmark',
            id: 'sl-field-wordmark',
            label: t('wordmark.title'),
            description: t('wordmark.desc'),
            wide: true,
            value: logo.wordmark || '',
            emptyLabel: t('empty'),
            chooseLabel: t('choose'),
            clearLabel: t('clear'),
            onPick: pickFile('wordmark'),
            onClear: () => { write({ wordmark: '' }) },
          }),
          h(CheckField, {
            key: 'hideMark',
            id: 'sl-field-hide-mark',
            label: t('hideMark.title'),
            description: t('hideMark.desc'),
            checked: logo[HIDE_MARK] === true,
            onChange: (next) => {
              setProblem('')
              write({ [HIDE_MARK]: next })
            },
          }),
          h(CheckField, {
            key: 'hideBrand',
            id: 'sl-field-hide-brand',
            label: t('hideBrand.title'),
            description: t('hideBrand.desc'),
            checked: logo[HIDE_BRAND] === true,
            onChange: (next) => {
              setProblem('')
              write({ [HIDE_BRAND]: next })
            },
          }),
          h(TextField, {
            key: 'name',
            id: 'sl-field-name',
            label: t('name.title'),
            description: t('name.desc'),
            placeholder: t('name.placeholder'),
            maxLength: 48,
            value: logo.name || '',
            onCommit: (next) => { write({ name: next }) },
          }),
          h(TextField, {
            key: 'badge',
            id: 'sl-field-badge',
            label: t('badge.title'),
            description: t('badge.desc'),
            placeholder: t('badge.placeholder'),
            maxLength: 16,
            value: logo.badge || '',
            onCommit: (next) => { write({ badge: next }) },
          }),

          h('p', { className: 'sl-error', role: 'status' }, problem),

          h('div', { className: 'sl-foot' },
            h('button', {
              type: 'button',
              className: 'sl-btn sl-btn-quiet',
              disabled: !configured,
              onClick: () => {
                const saved = store.reset()
                setProblem(saved ? '' : t('error.storage'))
              },
            }, t('reset')),
            h('p', { className: 'sl-note' }, t('note')),
          ),
        )
      }

      return LogoPage
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, TRANSLATIONS), 'sidebar-logo: dictionaries')
        const translate = ctx.locale.bind(NS)
        const store = createLogoStore()
        const brand = createBrandComponents(store)
        // Built once: the registered component identity stays stable across
        // declaration collapse and re-declaration.
        const page = createLogoPage(store, translate, brand)

        // Adopt writes made in another tab of the same origin.
        ctx.effect(() => {
          const onStorage = (event) => {
            if (event.key === STORAGE_KEY || event.key === null) store.rehydrate()
          }
          window.addEventListener('storage', onStorage)
          return () => {
            window.removeEventListener('storage', onStorage)
          }
        }, 'sidebar-logo: cross-tab sync')

        // One occupant per cell, each present only while its own piece is set:
        // an empty field leaves the shipped artwork of that cell alone.
        let markDisposer = null
        let nameDisposer = null
        const disposeMark = () => {
          if (markDisposer === null) return
          markDisposer()
          markDisposer = null
        }
        const disposeName = () => {
          if (nameDisposer === null) return
          nameDisposer()
          nameDisposer = null
        }
        const syncBrand = () => {
          const logo = store.getSnapshot()
          const hideBrand = logo[HIDE_BRAND] === true
          // A configured flag on its own is enough to take the mark cell: the
          // hide preferences paint nothing there, which is the point.
          const wantMark = hideBrand || Boolean(logo.mark) || logo[HIDE_MARK] === true
          const wantName = hideBrand || Boolean(logo.wordmark || logo.name || logo.badge)
          if (wantMark && markDisposer === null) {
            markDisposer = ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register({
              name: 'sidebar.brand.mark',
              priority: BRAND_PRIORITY,
              locale: NS,
            }, brand.BrandMark))
          } else if (!wantMark) {
            disposeMark()
          }
          if (wantName && nameDisposer === null) {
            nameDisposer = ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({
              name: 'sidebar.brand.name',
              priority: BRAND_PRIORITY,
              locale: NS,
            }, brand.BrandName))
          } else if (!wantName) {
            disposeName()
          }
        }
        ctx.effect(() => store.subscribe(syncBrand), 'sidebar-logo: brand sync')
        ctx.effect(() => () => {
          disposeMark()
          disposeName()
        }, 'sidebar-logo: brand teardown')
        syncBrand()

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'sidebar-logo',
          order: 90,
          label: () => translate('section.title'),
          locale: NS,
        }, page))
      },
    }
  },
})
