import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user.model.js"
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse";
import jwt from "jsonwebtoken"


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

const changeCurrentPassword = asyncHandler( async (req, res) => {
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect) {
    throw new ApiError(400, "Invalid user password")
  }

  user.password = newPassword
  await user.save({
    validateBeforeSave: true
  })

  return res
        .status(200)
        .json(
          new ApiResponse(200, {}, "Password changed successfully")
        )
})

const getCurrentUser = asyncHandler( async (req, res) => {
  return res
        .status(200)
        .json(
          new ApiResponse(
            200,
          req.user,
          "user fetched successfully"
          )
        )
})

const updateAccountDetails = asyncHandler( async(req, res) => {
  const {fullname, email} = req.body

  if(!fullname || !email) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname: fullname,
        email: email
      }
    },
    {new: true}
  ).select("-password")


  return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            user,
            "user details updated successfully"
          )
        )
})

  const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.user?.path

    if(!avatarLocalPath) {
      throw new ApiError(400, "avatar file not found")
    }

    const avatar = await uploadonCloudinary(avatarLocalPath)

    if(!avatar.url) {
      throw new ApiError(400, "Error while uploading on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url
        }
      },
      {new: true}
    ).select("-password")

    return res 
          .status(200)
          .json(
            new ApiResponse(
              200,
              user, 
              "Avatar image updated successfully"
            )
          )
  })

  const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

  const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(  
      new ApiResponse(200, user, "Cover image updated successfully")
    )
})

  const getUserChannelProfile = asyncHandler((async (req , res) => {
    const {username} = req.params

    if(!username?.trim()) {
      throw new ApiError(400, "username is misssing")
    }
    
    // Writing aggregation pipelines ...

    const channel = await User.aggregate([
     { 
      $match: {
        username: username?.toLowerCase()
      }
    },

    {
      // serach in document
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },

    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },

    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },

      channelsSubscribedToCount: {
        $size: "$subscribedTo"
      },

      isSubscribed: {
        $cond: {
          if: {$in: [req.user?._id, "subscribers.subscriber"]},
          then: true,
          else: false
        }
      }
      }
    },
    // Deciding what to project or dispaly ...
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
    ])

    if(!channel?.length) {
      throw new ApiError(404, "channel does not exist")
    }

    // On returning aggregation pipelines we generally get an array of objects ..

    return res
    .status(200)
    .json(
      200,
      channel[0],
      "User channel fetched successfully"
    )

  }))


const refreshAccessToken = asyncHandler( async (req, res) => {

  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  
  if(!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if(!user) {
      throw new ApiError(401, "Invalid Referesh Token")
    }

    if(incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used")
    }

    const options = {
      httpOnly: true,
      secure: true
    }

    
    const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)

    return res
    .status(200)
    .cookie("access Token", accessToken, options)
    .cookie("refresh Token", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, newRefreshToken},
        "Access token refreshed"
      )
    )

  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})


export {
        registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile
        
}