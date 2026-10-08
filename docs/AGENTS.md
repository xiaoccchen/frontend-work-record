# 本地轻量化前端开发工作日志记录工具AI 开发指令

## 项目概述
这是一个本地轻量化前端开发工作日志记录工具，使用 React + TypeScript 开发。

## 开发规范
- 使用 TypeScript，确保类型安全
- 组件使用函数式组件 + Hooks
- 使用 Tailwind CSS 编写样式
- 所有数据存储在 SQLite

## 代码风格
- 使用 ESLint 和 Prettier
- 组件名使用 PascalCase
- 函数名使用 camelCase
- 常量使用 UPPER_SNAKE_CASE

## 测试要求
- 每个功能完成后手动测试
- 确保数据正确存储和读取
- 测试各种边界情况

## 注意事项
- 保持代码简洁，避免过度设计
- 优先实现核心功能

---

## 技术栈裁决（覆盖 TECH_DESIGN.md 中的冲突描述）

TECH_DESIGN.md 写的 Element Plus / Pinia 属 Vue 生态，与本文档的 React 要求冲突。已确认按以下方案落地：

- 构建：Vite 6 + React 18 + TypeScript 5.7
- UI 组件库：**Ant Design 5**（替代 Element Plus）
- 状态管理：**Zustand**（替代 Pinia）
- 样式：Tailwind CSS v4（`@tailwindcss/vite` 插件，无需 content 配置）
- 路由：react-router-dom 6（`createBrowserRouter`）
- 日期：dayjs（全局 `zh-cn` locale）
- 存储：Electron 主进程 **better-sqlite3**（渲染进程经 preload 的 `window.api` 走 IPC）；浏览器 `npm run dev` 下回退 localStorage

## 工程约定

- 路径别名 `@` → `src`，需同时维护 [vite.config.ts](../vite.config.ts) 与 tsconfig.app.json
- 目录：`src/{components,pages,hooks,utils,types,store,router,services}`
- 页面为单文件组件（如 `pages/RecordPage.tsx`），不用 `index` 目录
- antd 使用 `ConfigProvider`（中文 locale + 主色 `#4a6b8a`），外层包裹 `<App>` 提供 message 上下文
- 桌面端：`electron/{main,preload,db,ipc}.ts`，由 `vite-plugin-electron` 编译到 `dist-electron/`（`main.js` 为 ESM，preload 输出 CJS 的 `preload.cjs`）；相关构建只在 `ELECTRON=1` 时启用
- 类型检查分三个项目：tsconfig.app.json（src）/ tsconfig.node.json（vite.config）/ tsconfig.electron.json（electron）
- 数据层统一收口在 [services/repositories.ts](../src/services/repositories.ts)：Electron 走 IPC 读写 SQLite，浏览器走 localStorage，store 只维护内存态
- 仓储按表拆分：`recordRepository` / `summaryRepository` / `projectRepository` / `quickPhraseRepository` / `settingsRepository` / `dataRepository`（全量覆盖与清空），每个都有 desktop（IPC）与 local（localStorage）两套实现，新增能力必须两边同步
- store 的内存态在 [src/main.tsx](../src/main.tsx) 的 bootstrap 里统一 hydrate（record / summary / project / quickPhrase / settings）；恢复备份、清空这类跨表写操作后必须重新 hydrate 才能刷新页面
- 异常提示统一走 [utils/error.ts](../src/utils/error.ts) 的 `getErrorMessage`（Electron IPC 抛出的错误会带 invoke 前缀，需裁掉）

## 必须遵守的约束（已踩过的坑）

1. **antd 日期选择器一律保持非受控**（不传 `value`）。做成受控后用户键入的日期会被 antd 回写的 value 清空——此 bug 出现过两次。
2. **不要在 antd 组件根节点上用 Tailwind 的 margin / padding 工具类**。antd 组件样式未分层，优先级高于 Tailwind 的 `@layer utilities`，实测 `<Card className="mb-4">` 的 `margin-bottom` 被 `.ant-card{margin:0}` 压成 0。改用外层 `div` + flex `gap`，或给工具类加 `!` 前缀。
3. **提示消息统一用 `App.useApp()` 取 `message`**，不要用 antd 静态 `message.*`（静态调用不消费 ConfigProvider 主题，会报 error）。
4. **数据模型以 TECH_DESIGN.md 的表结构为准**。`work_record` 已落地「重点标记 `is_key` / 工作量等级 `workload` / 标签 `tags`」，总结会按「重点 → 工作量等级 → 工时」排序并加 `【重点】` 标注。
5. **better-sqlite3 必须外部化**（`notBundle()`），它是原生模块，打进产物后 Rollup 无法解析 `.node`；它用的是 N-API 预编译产物，**不需要** electron-rebuild。
6. **better-sqlite3 的 `run()` 不接受 `undefined` 绑定值**，可选字段要显式兜成 `null`；UPDATE 的 `updated_at` 最容易漏（已踩过一次，冒烟用例才暴露出来）。
7. **重新安装依赖时要带 Electron 镜像**。本机 registry 是 npmmirror，但 Electron 二进制默认从 GitHub Releases 拉，会 `fetch failed`；换机器或 `npm ci` 后需 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js`。若运行环境不允许写 `%LOCALAPPDATA%\electron\Cache`，再加 `electron_config_cache=<可写目录>`。
8. **`project.name` 有 UNIQUE 约束**，新增/改名撞重名时底层会抛 `SqliteError`；统一经 `runWithUniqueNameGuard` 转成「项目「x」已存在」再返回渲染进程，且 localStorage 实现要保持同样的报错文案。
9. **备份恢复 / 清空一律走主进程 `db.transaction`**（`data:replace-all` / `data:clear-all`），不要在渲染进程逐条 IPC 删除或写入。

## 当前进度

已完成：

- 工程初始化：Vite + React + TS + Tailwind v4 + antd；ESLint 9 flat config + Prettier；路由 + 左侧导航主布局（`components/MainLayout.tsx`、`components/PageHeader.tsx`）
- 工作录入：`pages/RecordPage.tsx` —— 新增/编辑双模式（`/record?id=N`）、必填校验、草稿自动留存、同日重复提醒、项目名自动补全（候选来自项目字典与历史日志）；另含工作量等级、重点标记、标签；「工作内容」标签右侧有「快捷短语」下拉，点选后**追加**到内容末尾（不覆盖），追加时手动同步草稿（`setFieldsValue` 不触发 `onValuesChange`）；`store/recordStore.ts`、`store/appStore.ts`（草稿）
- 日志管理：`pages/RecordsPage.tsx` —— 日期区间 / 工作类型 / 重点标记 / 关键词（含标签）筛选，卡片按日期倒序并展示重点、工作量、标签
- 总结生成：`pages/SummaryPage.tsx` —— 按月 / 按季度 / 自定义时间段；两套模板（通用标准版按工作类型分组、技术侧重版按项目分组并统计工时）；五章节结构；在线编辑；导出 TXT（纯文本）/ Markdown；历史总结留存与二次编辑。依赖：`utils/summary.ts`（重点优先排序与标注、`summaryToPlainText`）、`utils/download.ts`、`store/summaryStore.ts`
- Electron + SQLite：`electron/`（主进程建表/迁移 + IPC + preload 暴露 `window.api`），`services/repositories.ts` 按环境切换 SQLite / localStorage，并做旧版 localStorage 数据的一次性迁移；`npm run dev:desktop` / `npm run build:desktop`
- 项目字典：`project` 表全链路打通 —— `electron/ipc.ts` 的 `projects:*`、`store/projectStore.ts`、设置页 CRUD 表格；工作录入的项目名候选取「字典 ∪ 历史日志用过的名称」，保存新名称后弹窗询问是否入库
- 设置页数据管理：`pages/SettingsPage.tsx` 的备份导出 / 恢复导入 / 清空全部数据；整表覆盖与清空走主进程事务（`data:replace-all` / `data:clear-all`），恢复后统一重新 hydrate 五个 store。同页另有「项目字典」「快捷短语」两张 CRUD 表格卡片（结构一致，可直接照抄新增同类字典）
- 存储层 v2（SCHEMA_VERSION 1 → 2）：新增 `quick_phrase`（快捷短语）与 `app_setting`（键值配置）两表，`electron/{db,ipc,preload}.ts` 与 `services/repositories.ts` 双实现、`store/quickPhraseStore.ts`、`store/settingsStore.ts` 均已打通；升级到 v2 时灌入 `DEFAULT_QUICK_PHRASES` 初值（只在迁移那一次，删光后不复活），备份/恢复/清空已覆盖两张新表，旧备份缺这两张表时按空数据兼容

未完成：

- 桌面端打包（electron-builder 安装包）尚未接入
- 数据统计概览、深浅色主题
- 定时记录提醒尚未实现（`app_setting` 存储层已就绪）

### 剩余计划（技术选型已确认，按此顺序执行）

- **C 数据统计概览**：新增 `utils/stats.ts`（纯函数：工作类型占比、工作量等级分布、按月条目数/工时趋势、重点项目 Top N、重点工作数）+ `pages/StatsPage.tsx`；`router/index.tsx` 加 `/stats`，`MainLayout` 菜单加一项（排在「日志管理」之后）。周期选择复用 `SummaryPage` 的 Segmented 模式。**不引入第三方图表库**，图表用 antd `Statistic` + 自绘占比条 / SVG 折线
- **D 年度总结**：`utils/date.ts` 加 `getYearRange(year)`；`SummaryPage` 的 `PeriodType` 增加 `'year'` 并复用现成 `yearOptions`；`utils/summary.ts` 的 `buildSummaryContent` 无需改动（周期由入参决定）
- **E Word 导出**：新增 `utils/markdown.ts` 的 `markdownToHtml`（只覆盖总结生成用到的语法：`#` 标题、`**加粗**`、`-` 列表、段落，风格对齐 `summaryToPlainText`）；`utils/download.ts` 加 `downloadWordFile`（Word 兼容头 + `application/msword` 的 .doc Blob，零依赖）；`SummaryPage` 的 `handleExport` 扩展 `'doc'` 分支
- **F 定时记录提醒**：设置项写入 `app_setting`（键 `reminder.enabled` / `reminder.time` / `reminder.lastFiredDate`）；新增 `hooks/useDailyReminder.ts` 做分钟级轮询，命中时间且当日未触发过才提醒，触发后回写 `lastFiredDate`；桌面端走主进程 `Notification`（新增 IPC `app:notify`），浏览器回退 Notification API（需授权）；点击提醒跳 `/record`，设置页加「记录提醒」卡片

数据模型对应的类型定义集中在 `src/types/index.ts`（`WorkRecord` / `WorkRecordDraft` / `Project` / `ProjectDraft` / `QuickPhrase` / `QuickPhraseDraft` / `AppSetting` / `WorkSummary` / `BackupData` / `BackupFile` / `DesktopApi`），工作类型枚举见 `src/utils/constants.ts`。备份文件格式为 `BackupFile`（`app` 标识 + `schemaVersion` + `exportedAt` + 五张表数据：`work_record` / `work_summary` / `project` / `quick_phrase` / `app_setting`），`schemaVersion` 取自 `utils/constants.ts` 的 `DATA_SCHEMA_VERSION`，**必须与 `electron/db.ts` 的 `SCHEMA_VERSION` 同步递增**（当前均为 2）。

## 验证方式

- 提交前必跑：`npx tsc -b; npx eslint .`（两者均需零报错）
- 浏览器模式：`npm run dev`（默认 http://localhost:5173，被占用时顺延）
- 桌面模式（Electron + SQLite）：`npm run dev:desktop`；打包产物验证 `npm run build:desktop` 后 `npx electron .`
- Electron 冒烟：可加 `--remote-debugging-port=9222` 后连 CDP 在渲染进程里直接调 `window.api` 验证 IPC 链路。**冒烟必须指向隔离的 userData 目录**，否则 `data:clear-all` 会清掉真实库：临时给 `vite.config.ts` 的 `main.onstart` 传 `startup(['.', '--no-sandbox', '--remote-debugging-port=9222', '--user-data-dir=<临时目录>'])`，验证完回滚该改动；`vite-plugin-electron` 本身也认 `REMOTE_DEBUGGING_PORT` 环境变量。另注意冒烟环境下主进程可能报 `Network service crashed` 导致首屏空白，用 CDP 的 `Page.navigate` 显式导航一次即可加载。
- 更省事的等价冒烟（无需改 `vite.config.ts`）：`npm run build:desktop` 后 `npx electron . --no-sandbox --remote-debugging-port=9222 --user-data-dir=<临时目录>`，再用 Node（≥22 自带全局 `WebSocket`）从 `http://127.0.0.1:9222/json/list` 取页面 `webSocketDebuggerUrl`，发 `Runtime.evaluate`（`awaitPromise: true`）调用 `window.api.*`；库版本与表结构可直接用 better-sqlite3 只读打开 `<临时目录>/work-record.db` 核对。
- 浏览器自动化工具无法驱动 antd 的 `RangePicker`（单日期选择器可以），涉及区间选择器的验证需人工点一次