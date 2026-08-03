const PRINT_SCRIPT = `<script>
window.addEventListener('load', function () {
  setTimeout(function () { window.print() }, 500)
});
window.addEventListener('afterprint', function () {
  window.close()
});
</script>`

export function appendPrintScript(html: string): string {
  if (html.includes('</body>')) {
    return html.replace('</body>', `${PRINT_SCRIPT}</body>`)
  }
  return `${html}${PRINT_SCRIPT}`
}
