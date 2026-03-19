import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface IProject {
  _id: string;
  name: string;
  colour: string;
  systemPrompt: string;
  aiModel: string;
  webSearch: boolean;
  files: { name: string; qdrantCollection: string }[];
  chatCount: number;
}

interface ProjectState {
  projects: IProject[];
  activeProjectId: string | null;
  isLoading: boolean;
  
  // Actions
  setProjects: (projects: IProject[]) => void;
  setActiveProject: (projectId: string | null) => void;
  fetchProjects: () => Promise<void>;
  createProject: (data: Partial<IProject>) => Promise<IProject>;
  updateProject: (id: string, data: Partial<IProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,
      isLoading: false,

      setProjects: (projects) => set({ projects }),
      setActiveProject: (activeProjectId) => set({ activeProjectId }),

      fetchProjects: async () => {
        set({ isLoading: true });
        try {
          const res = await axios.get(`${API_URL}/projects`);
          set({ projects: res.data });
        } catch (err) {
          console.error('Failed to fetch projects:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      createProject: async (data) => {
        const res = await axios.post(`${API_URL}/projects`, data);
        await get().fetchProjects();
        return res.data;
      },

      updateProject: async (id, data) => {
        await axios.patch(`${API_URL}/projects/${id}`, data);
        await get().fetchProjects();
      },

      deleteProject: async (id) => {
        await axios.delete(`${API_URL}/projects/${id}`);
        if (get().activeProjectId === id) set({ activeProjectId: null });
        await get().fetchProjects();
      }
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({ activeProjectId: state.activeProjectId }),
    }
  )
);
