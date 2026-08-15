const getPlatform = () => {
    if (typeof window !== 'undefined' && window.api?.platform) {
        return window.api.platform
    }
    if (typeof navigator !== 'undefined' && /Macintosh/i.test(navigator.userAgent)) {
        return 'darwin'
    }
    return 'linux'
}

export const isMac = () => getPlatform() === 'darwin'

const parseShortcut = (shortcut) => {
    const str = shortcut.trim()
    const upper = str.toUpperCase()

    const hasUnicodeModifiers = /[⌘⇧⌥⌃]/.test(str)

    let cmd = false
    let shift = false
    let option = false
    let ctrl = false
    let main = ''

    if (hasUnicodeModifiers) {
        cmd = upper.includes('CMD') || str.includes('⌘')
        ctrl = upper.includes('CTRL') || str.includes('⌃') || upper.includes('CONTROL')
        shift = upper.includes('SHIFT') || str.includes('⇧')
        option = upper.includes('ALT') || upper.includes('OPTION') || str.includes('⌥')

        main = str
        if (cmd) main = main.replace(/[⌘]/g, '')
        if (ctrl) main = main.replace(/[⌃]/g, '')
        if (shift) main = main.replace(/[⇧]/g, '')
        if (option) main = main.replace(/[⌥]/g, '')
        main = main.trim()
    } else {
        const parts = str.split(/[+\s]/)

        for (const part of parts) {
            const p = part.trim().toUpperCase()
            if (p === 'CMD' || p === 'COMMAND') cmd = true
            else if (p === 'CTRL' || p === 'CONTROL') ctrl = true
            else if (p === 'SHIFT') shift = true
            else if (p === 'ALT' || p === 'OPTION') option = true
            else main = part
        }
    }

    return { cmd, shift, option, ctrl, main }
}

// Takes a shortcut string (e.g. '⌘⇧L' or 'cmd+shift+L') and renders it
// for the current platform: '⌘⇧L' on macOS, 'Ctrl+Shift+L' elsewhere.
export const formatShortcut = (shortcut) => {
    const { cmd, shift, option, ctrl, main } = parseShortcut(shortcut)

    if (isMac()) {
        let label = main
        if (ctrl) label = '⌃' + label
        if (option) label = '⌥' + label
        if (shift) label = '⇧' + label
        if (cmd) label = '⌘' + label
        return label
    }

    const parts = []
    if (ctrl) parts.push('Ctrl')
    if (option) parts.push('Alt')
    if (shift) parts.push('Shift')
    if (cmd) parts.push('Ctrl')
    parts.push(main)
    return parts.join('+')
}

// Platform value expected by the Vuetify VHotkey component.
export const vHotkeyPlatform = () => (isMac() ? 'mac' : 'pc')