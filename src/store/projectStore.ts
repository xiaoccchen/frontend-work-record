import { create } from 'zustand'
import { projectRepository } from '@/services/repositories'
import type { Project, ProjectDraft } from '@/types'

interface ProjectState {
  /** 项目字典，按 id 升序存放 */
  projects: Project[]
  /** 是否已从存储层载入完成 */
  hydrated: boolean
  hydrate: () => Promise<void>
  addProject: (draft: ProjectDraft) => Promise<Project>
  updateProject: (id: number, patch: Partial<ProjectDraft>) => Promise<void>
  removeProject: (id: number) => Promise<void>
}

/**
 * 项目字典仓库。
 * 持久化落在 SQLite（Electron 主进程 via IPC）或 localStorage（浏览器），
 * 具体实现见 `services/repositories.ts`，这里只维护内存态。
 */
export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  hydrated: false,

  hydrate: async () => {
    const projects = await projectRepository.list()
    set({ projects, hydrated: true })
  },

  addProject: async (draft) => {
    const project = await projectRepository.create(draft)
    set({ projects: [...get().projects, project] })
    return project
  },

  updateProject: async (id, patch) => {
    const updated = await projectRepository.update(id, patch)
    set({ projects: get().projects.map((item) => (item.id === id ? updated : item)) })
  },

  removeProject: async (id) => {
    await projectRepository.remove(id)
    set({ projects: get().projects.filter((item) => item.id !== id) })
  },
}))
