import express from "express";
import {
  createUser,
  getUsers,
  loginUser,
  getActiveUsersStats,
  getProfile,
  logout,
  updateProfile,
  updateUser,
  updateUserPassword,
  changePassword,
} from "../controllers/userController.js";

import { validatePasswordStrength } from "../middlewares/validatePasswordStrength.js";

import { checkAuth } from "../middlewares/checkAuth.js";
import authUser from "../middlewares/authUser.js";
import  {uploadMemory}  from "../middlewares/multer.js";

const userRouter = express.Router();

userRouter.get("/get-users", authUser, getUsers);
userRouter.post("/create", validatePasswordStrength, createUser);
userRouter.post("/login", loginUser);
userRouter.post("/logout", logout);
userRouter.get("/get-profile", authUser, getProfile);
userRouter.get("/active-users", getActiveUsersStats);
userRouter.put(
  "/update-profile",
  uploadMemory.single("image"),
  authUser,
  updateProfile
);
userRouter.put("/update-user/:id", authUser, updateUser);
userRouter.put("/update-password/:id", authUser, updateUserPassword);
userRouter.post("/change-password", authUser, changePassword);

userRouter.get("/checkauth", checkAuth);

export default userRouter;
