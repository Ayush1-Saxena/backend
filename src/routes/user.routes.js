import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";

const router = Router();

// route for register user
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

// route for login user
router.route("/login").post(loginUser);

// secure routes(here login is required)
// route for logout user
router.route("/logout").post(verifyJWT, logoutUser);
// route for generating new refreshToken
router.route("/refresh-token").post(refreshAccessToken);

export default router;
