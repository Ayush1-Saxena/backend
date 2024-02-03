import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// method for generate access token and refresh token
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId); //find user by userId
    const accessToken = user.generateAccessToken(); //generate access token
    const refreshToken = user.generateRefreshToken(); //generate refresh token

    user.refreshToken = refreshToken; //save refresh token in db
    await user.save({ validateBeforeSave: false }); // in this step it is saved successfully

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  /*
Register user steps
-> get user details from frontend
-> validation check - not empty, etc.
-> check if user already exists - using username, email
-> check for files, images - here check avatar
-> upload the files to cloudinary - here check avatar
-> create user object - create entry in db
-> remove password and refresh token field from response
-> check for user creation 
-> return response

*/

  // get user details from frontend
  const { fullName, username, email, password } = req.body;

  // validation check - not empty
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exist
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  // check for files, images
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  // for TypeError: Cannot read properties of undefined (reading '0')
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // check for avatar
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload the files to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // check for avatar upload
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // create user object, create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // check entry of user in db and also remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  /*
steps for login user
-> get login details from frontend --> req.body -> data
-> check for username/email
-> find the user from the db
-> password check 
-> generate access and refresh token
-> send token as cookie
*/

  // get login details from frontend
  const { username, email, password } = req.body;
  // check for username/email
  if (!username || !email) {
    throw new ApiError(400, "username or email is required");
  }

  // find the user from db
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // password check
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password is incorrect");
  }

  // generate access token and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // send token as cookie
  const loggedInUser = await User.findById(user._id).select(
    // first get user details from db
    "-password -refreshToken"
  );
  const options = {
    // options for cookies
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options) // send cookie
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  /*
steps for logoutUser
-> find the user --> using middleware
-> reset the refreshToken 
-> clear the cookies
*/

  // find the user --> using Auth.middleware.js --> verifyJWT
  const resetRefreshToken = await User.findByIdAndUpdate(
    req.user._id,
    {
      // reset the refresh token
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  // clear the cookies --> first get cookies option then delete them by returning res
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options) // clear the cookies
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

export { registerUser, loginUser, logoutUser };
