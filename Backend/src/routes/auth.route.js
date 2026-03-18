import express from 'express'
import authControllers from '../controllers/auth.controllers.js'
import requireAuth from "../middlewares/auth.middleware.js"

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


export default router