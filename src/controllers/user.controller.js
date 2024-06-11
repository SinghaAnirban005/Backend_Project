import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user.model.js"
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse";


const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
  
    user.refreshToken = refreshToken
  
    await user.save({ validateBeforeSave: false })
  
    return {accessToken, refreshToken}

  } catch (error) {

    throw new ApiError(500, "Something went wrong while generating refresh and access token ")
  }

}

// aysncHandler is the higher Order function...
const registerUser = asyncHandler( async (req, res) => {
    // Algorithm to be followed ..
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // we take data from the user...
    const {fullname, email, username, password } = req.body
    console.log("Email: ", email);

    // check whether any of the inputs is empty ...
    if(fullname.trim() === "") {
      throw new ApiError(400, "All fields are required")
    }
    if(email.trim() === "") {
      throw new ApiError(400, "All fields are required")
    }
    if(username.trim() === "") {
      throw new ApiError(400, "All fields are required")
    }
    if(password.trim() === "") {
      throw new ApiError(400, "All fields are required")
    }

    // Keep a check whether the user already exists
    const existedUser = await User.findOne(
      {
        $or:  [{username}, {email}]
      }
    )
    if (existedUser) {
      throw new ApiError(409, "User with username or email already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path

    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath ;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadonCloudinary(avatarLocalPath)
    const coverImage = await uploadonCloudinary(coverImageLocalPath)

    if(!avatar) {
      throw new ApiError(400, "Avatar file is required")
    }

    // Now we shall send data to the DB...
    const user = await User.create(
      {
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
      }
    )

    // here we select all those keys we do not want to send ...
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    )

    // Make sure user is created ...

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering account")
    }

    return res.status(201).json(
      new ApiResponse(200, createdUser, "User Registered successfully")
    )


})

const loginUser = asyncHandler( async (req, res) => {

    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, username, password} = req.body

    if (!username && !email) {
      throw new ApiError(400, "Email or Username is required ")
    }

    const user = await User.findOne({
      $or: [{username}, {email}]
   })

    if (!user) {
      throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordValid(password)

    if(!isPasswordValid) {
      throw new ApiError(401, "Invalid User Credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        user= loggedInUser, accessToken, refreshToken,

      ),

      "User Logged In Successfully"
    )

})


const logoutUser = asyncHandler( async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1 //This removes the field from the document
      }
    },
    
    {
      new: true
    }

  )


  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

})


export {registerUser,
        loginUser,
        logoutUser,
}