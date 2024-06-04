class ApiResponse {
  constructor(statusCode, data, message="Success") {
      this.statusCode = statusCode
      this.data = data //Learn a bit more on this
      this.message = message
      this.success = statusCode < 400
  }
}

export { ApiResponse }