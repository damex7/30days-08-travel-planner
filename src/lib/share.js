/*
  Copy and download helpers.

  Copy: the Clipboard API needs a secure context (https or localhost) and
  can be refused by the browser. The fallback is the old trick: put the
  text in a hidden textarea, select it and run the "copy" command.
*/
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    area.remove()
    return ok
  }
}

/** Save `data` as a pretty-printed .json file. No server: the file is built in the browser as a Blob. */
export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the download a moment to start before releasing the memory
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
