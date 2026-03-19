import express from 'express'
import authControllers from '../controllers/auth.controllers.js'
import requireAuth from "../middlewares/auth.middleware.js"
import passport from "../passport/passport.js";

const router = express.Router()


router.post('/register',authControllers.registerUser)
router.post('/login',authControllers.loginUser)
router.post('/refresh', authControllers.refreshToken)
router.post('/logout', authControllers.logoutUser)
router.get('/user', requireAuth, authControllers.getUser)
router.post('/forgot-password',authControllers.forgotPassword)
router.post('/verify-otp',authControllers.verifyOtp)
router.post('/reset-password',authControllers.resetPassword)
router.post('/verify-email',authControllers.verifyEmailOtp)
router.post('/resend-email-otp',authControllers.resendEmailOtp)

// redirect to google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  authControllers.googleAuthCallback
);


export default router