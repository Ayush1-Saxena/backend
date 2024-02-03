// middleware use for authentication of user with cookies(access & refresh token)
// use for logout

import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // get token from cookies/headers(postman)
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // if token not found
    if (!token) {
      throw new ApiError(401, "Unauthorized Request");
    }

    // verify the jwt token and get the payload if verified
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // find the user by decodedToken data
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    // if user not found
    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    // if user found
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
