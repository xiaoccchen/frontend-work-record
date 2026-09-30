/** 从异常中取出可展示的提示文案；Electron IPC 错误会带 invoke 前缀，这里只取最后一段 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const parts = error.message.split(': ')
    return parts[parts.length - 1] || error.message
  }
  return '操作失败，请重试'
}
