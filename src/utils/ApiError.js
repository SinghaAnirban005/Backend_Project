class ApiError extends Error{
  constructor(
    statusCode,
    message= "Something Went Wrong",
    errors = [],
    stack=""
  ) {
    super(message)
    this.statusCode = statusCode,
    this.data = null,
    this.message = message,
    this.success = false,
    this.errors = errors

    //Below is an optional block of code...
    if (stack) {
      this.stack = stack
  } else{
      Error.captureStackTrace(this, this.constructor)
  }

  }

}


export {ApiError}