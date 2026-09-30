# 本地轻量化前端开发工作日志记录工具技术设计

## 技术栈

- 前端：React 18 + TS + Vite 6
- 组件库：Ant Design 5
- 数据存储：SQLite（主进程 better-sqlite3）
- 状态管理：Zustand
- 桌面壳：Electron

## 项目结构

```
electron/         # Electron 主进程：main.ts / preload.ts / db.ts（建表 + 迁移）/ ipc.ts（IPC 处理器）
src/
  components/     # 组件
  pages/          # 页面
  hooks/          # 自定义 Hooks
  services/       # 数据层：repositories.ts 按环境切换 SQLite(IPC) / localStorage
  utils/          # 工具函数
  types/          # 类型定义
  store/          # Zustand 内存态
```

## 数据存储架构

- 渲染进程不直接读写数据库，统一走 `window.api`（preload 通过 `contextBridge` 注入，`contextIsolation: true`）
- 主进程持有唯一的 better-sqlite3 连接，数据库文件位于 `app.getPath('userData')/work-record.db`（WAL 模式）
- 建表与版本管理在 `electron/db.ts`：`PRAGMA user_version` 记录表结构版本，字段变更时递增并补 `ALTER TABLE`
- 渲染进程的数据层在 `src/services/repositories.ts` 收口：
  - Electron 环境（`window.api` 存在）→ 走 IPC 读写 SQLite
  - 浏览器环境（`npm run dev`）→ 走 localStorage，键名 `frontend-work-record:db:*`
  - 首次运行会把旧版 zustand persist 的数据一次性迁移过来
- Zustand 只维护内存态，页面改动后自增主键与 `created_at` / `updated_at` 一律由持久化层生成

## 数据模型

### 1. work_record（工作日志主表）

| 字段名          | 类型    | 约束                      | 说明                                                         |
| --------------- | ------- | ------------------------- | ------------------------------------------------------------ |
| id              | INTEGER | PRIMARY KEY AUTOINCREMENT | 自增主键                                                     |
| log_date        | TEXT    | NOT NULL                  | 工作日期，格式 `YYYY-MM-DD`，用于按月 / 季度筛选，单独存字段方便查询 |
| start_time      | TEXT    | NULL                      | 开始时间 `HH:mm`，可选，用于记录工时                         |
| end_time        | TEXT    | NULL                      | 结束时间 `HH:mm`，可选                                       |
| project_name    | TEXT    | NOT NULL                  | 项目名称（MVP 直接存字符串；后续版本关联 project.id）        |
| work_content    | TEXT    | NOT NULL                  | 工作详细内容，支持换行，核心内容，生成总结的数据源           |
| work_type       | TEXT    | NULL                      | 工作类型：页面开发 / Bug 修复 / 代码 Review / 需求沟通 / 部署上线 / 学习调研 |
| remark          | TEXT    | NULL                      | 备注，可选，记录阻塞问题、待跟进事项                         |
| estimated_hours | REAL    | NULL                      | 预估花费工时，例如：2.5 代表 2.5 小时                        |
| is_key          | INTEGER | NOT NULL DEFAULT 0        | 重点工作标记，0/1；生成总结时优先提取并加 `【重点】` 标注    |
| workload        | TEXT    | NULL                      | 工作量等级：轻量 / 常规 / 繁重，参与总结排序                 |
| tags            | TEXT    | NOT NULL DEFAULT '[]'     | 自定义标签，JSON 数组字符串，如 `["性能优化","兼容性"]`      |
| created_at      | TEXT    | NOT NULL                  | 记录创建时间 `YYYY-MM-DD HH:mm:ss`                           |
| updated_at      | TEXT    | NOT NULL                  | 记录最后修改时间 `YYYY-MM-DD HH:mm:ss`                       |

索引：`idx_work_record_log_date (log_date)`

### 2. project 项目字典表

作用：下拉选择项目，避免手动重复输入项目名称，统一项目名称。

| 字段名      | 类型    | 约束                      | 说明         |
| ----------- | ------- | ------------------------- | ------------ |
| id          | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键         |
| name        | TEXT    | NOT NULL UNIQUE           | 项目名称     |
| description | TEXT    | NULL                      | 项目简单描述 |
| created_at  | TEXT    | NOT NULL                  | 创建时间     |

### 3. work_summary 历史总结表

| 字段名       | 类型    | 约束                      | 说明                                    |
| ------------ | ------- | ------------------------- | --------------------------------------- |
| id           | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键                                    |
| title        | TEXT    | NOT NULL                  | 总结标题                                |
| period_start | TEXT    | NOT NULL                  | 统计周期开始日期 `YYYY-MM-DD`           |
| period_end   | TEXT    | NOT NULL                  | 统计周期结束日期 `YYYY-MM-DD`           |
| template     | TEXT    | NOT NULL                  | 模板标识：standard（通用标准版）/ tech（技术侧重版） |
| content      | TEXT    | NOT NULL                  | 总结正文（Markdown）                    |
| created_at   | TEXT    | NOT NULL                  | 创建时间                                |
| updated_at   | TEXT    | NOT NULL                  | 最后修改时间                            |

## 总结中的重点提取规则

`src/utils/summary.ts` 对周期内日志统一按以下优先级排序，保证重点内容排在各分组最前面：

1. 重点标记 `is_key` 为真优先
2. 工作量等级：繁重 > 常规 > 轻量
3. 预估工时由大到小

同时：概述章节统计「重点工作 N 项」并单列重点工作清单、分出「工作量分布」；分组标题追加「含重点 N 项」；重点条目正文前加 `【重点】`，导出纯文本后依然可辨识。

## 关键技术点

1. 渲染进程与 SQLite 之间只通过 IPC 通信（`electron/ipc.ts` 注册 handler，`electron/preload.ts` 暴露 `window.api`）
2. better-sqlite3 13 使用 N-API 预编译产物（`prebuilds/<platform>.node`），Node 与 Electron 共用，无需 electron-rebuild
3. 使用 Zustand 管理内存状态，持久化交给 `src/services/repositories.ts`
4. 使用 dayjs 处理日期
