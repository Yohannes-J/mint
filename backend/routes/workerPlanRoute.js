// routes/workerPlanRoute.js
import express from 'express';
import { getWorkerPlans } from '../controllers/workerPlanController.js';
import authUser from '../middlewares/authUser.js';

const workerPlanRouter = express.Router();
workerPlanRouter.get('/', authUser, getWorkerPlans);

export default workerPlanRouter;
