# 本地轻量化前端开发工作日志记录工具技术设计

## 技术栈

- 前端：React + TS + Vite
- 组件库：Ant Design
- 数据存储：SQLite
- 打包：Electron

## 项目结构

src/
  components/     # 组件
  pages/          # 页面
  hooks/          # 自定义 Hooks
  utils/          # 工具函数
  types/          # 类型定义

## 数据模型

### 1.work_record（工作日志主表）
- | 字段名          | 类型    | 约束                      | 说明                                                         |
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
  | created_at      | TEXT    | NOT NULL                  | 记录创建时间 `YYYY-MM-DD HH:mm:ss`                           |
  | updated_at      | TEXT    | NOT NULL                  | 记录最后修改时间 `YYYY-MM-DD HH:mm:ss`                       |

### 2.project 项目字典表

作用：下拉选择项目，避免手动重复输入项目名称，统一项目名称。

| 字段名      | 类型    | 约束                      | 说明         |
| ----------- | ------- | ------------------------- | ------------ |
| id          | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键         |
| name        | TEXT    | NOT NULL UNIQUE           | 项目名称     |
| description | TEXT    | NULL                      | 项目简单描述 |
| created_at  | TEXT    | NOT NULL                  | 创建时间     |

## 关键技术点

1. 使用 SQLite 存储数据
2. 使用Zustand管理状态
3. 使用dayjs处理日期