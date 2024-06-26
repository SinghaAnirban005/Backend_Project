import connect from "./db/index.js";
import dotenv from 'dotenv'
import express from "express";

const app = express()

dotenv.config({
  path: './.env'
})

connect().then( () => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port ${process.env.PORT}`);
    })
  }
)
.catch((error) => {
  console.log("MONGO DB connection failed !!!", error);
})












// (async () => {
//   try {
    
//     await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)

//     app.on("error", (error) => {
//       console.log("ERROR: ", error);
//       throw error
//     })


//     app.listen(process.env.PORT, () => {
//       console.log(`Example app listening on port ${process.env.PORT}`);
//     })

//   } catch (error) {
//     console.error("ERROR: ", error)
//     throw error
//   }

// }) ()