import { Router } from 'express';
import * as ProjectController from '../controllers/project.controller';

const router = Router();

router.post('/', ProjectController.createProject);
router.get('/', ProjectController.getAllProjects);
router.get('/:id', ProjectController.getProjectById);
router.patch('/:id', ProjectController.updateProject);
router.delete('/:id', ProjectController.deleteProject);
router.get('/:id/chats', ProjectController.getProjectChats);

export default router;
