import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:process.env.CLOUDINARY_API_KEY ,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// use async await because this process will take time...
const uploadonCloudinary = async(localFilePath) => {
  try {
      if (!localFilePath) return null
      
      const response = await cloudinary.uploader.upload(localFilePath, 
        {
          resource_type:"auto"
        }
      )
      // uptil here file has been uploaded
      console.log(response.url);
      fs.unlinkSync(localFilePath)
      return response

  } catch (error) {
      fs.unlinkSync(localFilePath)
      return null
  }
}


export {uploadonCloudinary}