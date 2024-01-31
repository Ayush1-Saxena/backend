const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

/*
const asyncHandler = (func) => {};
const asyncHandler = (func) => {() => {}};
const asyncHandler = (func) => async() => {}
// function which has another func as a argument or it returns a func is called higher order func

*/

/*    
const asyncHandler = (func) => async (req, res, next) => {
  try {
    await (req, res, next);
  } catch (error) {
    res.status(error.code || 500).json({
      success: false,
      message: error.message,
    });
  }
};
*/
