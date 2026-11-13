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
      },
    }

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

      /**
       * Square mark: the shipped slot hands over the edge length it wants.
       * Also serves the "hide the mark cell" preference, which keeps the cell
       * occupied but paints nothing — that is what lets a self-contained
       * wordmark stand alone without the shipped whale beside it.
       * @param {{ size?: number }} props - sidebar-supplied geometry.
       */
      function BrandMark(props) {
        const logo = useLogo()
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
        if (logo.mark && logo[HIDE_MARK] !== true) strip.push(h(brand.BrandMark, { key: 'mark', size: 24 }))
        if (logo.wordmark || logo.name || logo.badge) strip.push(h(brand.BrandName, { key: 'name' }))
        const configured = strip.length > 0 || logo[HIDE_MARK] === true

        return h('div', { className: 'sl-page' },
          h('style', { key: 'css' }, PAGE_CSS),
          h('p', { className: 'sl-intro' }, t('intro')),

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
          // A configured flag on its own is enough to take the mark cell: the
          // hide preference paints nothing there, which is the point.
          const wantMark = Boolean(logo.mark) || logo[HIDE_MARK] === true
          const wantName = Boolean(logo.wordmark || logo.name || logo.badge)
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
