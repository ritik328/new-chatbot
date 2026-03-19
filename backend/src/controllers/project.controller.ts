import { Request, Response } from 'express';
import { Project } from '../models/Project';
import { Conversation } from '../models/Conversation';

export const createProject = async (req: Request, res: Response) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    // Optional: Delete or un-link chats in this project
    await Conversation.updateMany({ projectId: req.params.id }, { projectId: null });
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjectChats = async (req: Request, res: Response) => {
  try {
    const chats = await Conversation.find({ projectId: req.params.id }).sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
