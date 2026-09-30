/** 触发浏览器下载文本文件 */
export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // 延迟释放，避免部分浏览器取消尚未开始的下载
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
