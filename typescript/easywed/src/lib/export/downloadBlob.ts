export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    // Defer teardown so the browser has time to kick off the download request
    // before the object URL is invalidated.
    a.remove()
    URL.revokeObjectURL(url)
  }, 100)
}
