const passport = require("passport");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("./../models/userModel");

process.loadEnvFile(".env");

exports.googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"]
});

exports.googleAuthCallback = passport.authenticate("google", {
  failureRedirect: "/login",
  session: false
});

exports.authRedirect = async (req, res, next) => {
  const token = await req.user.generateJWT();
  res.cookie("jwtToken", token,{
    httpOnly: false,
    secure: false,
    sameSite:'Lax'
  });
  res.redirect("http://localhost:5713/home");
  next();
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});
