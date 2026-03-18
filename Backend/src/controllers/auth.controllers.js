import userModel from "../models/user.model.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { Resend } from "resend";
import { isValidPhoneNumber } from "libphonenumber-js";

const resend_domain = process.env.RESEND_EMAIL_DOMAIN

let resendClient;
function getResend() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is missing. Set it in your environment before sending email.");
  }
  resendClient = new Resend(key);
  return resendClient;
}

function isStrongPassword(password) {
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}\-_=+|\\:;"'<>,./~`]).{8,}$/;
    return strongPasswordRegex.test(password);
  }

// import nodemailer from "nodemailer"
// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   },);

function cookieOptions(maxAgeMs) {
    const isProd = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProd ? true : false,
        sameSite: isProd ? "none" : "lax",
        maxAge: maxAgeMs,
    };
}

async function registerUser(req,res) {
    const {username,phone_number,email,password,role="customer"}=req.body

    const userExists = await userModel.findOne({
        $or:[
            {email},
            {phone_number}
        ]
    })
    if(userExists){
        return res.status(409).json({
            message:"User Already Exists"
        })
    }
    
    if (!isStrongPassword(password)) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
        });
      }

    const hash = await bcrypt.hash(password,10)

    if(!isValidPhoneNumber(phone_number,"IN")){
        return res.status(400).json({
            message:"Invalid phone number"
        })
    }

    const user = await userModel.create({
        username,
        phone_number,
        email,
        password:hash,
        role
    })

    const otp = crypto.randomInt(100000,999999).toString()
    const otpExpirey = new Date(Date.now() + 5*60*1000)
    user.otp = {code:otp,expiresAt:otpExpirey}
    await user.save()

    await getResend().emails.send({
        from: `Groommate <onboarding@${resend_domain}>`,
        to: user.email,
        subject: "Verify your Groommate account",
        html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#4f46e5;padding:32px;text-align:center;">
                <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">✂️ Groommate</p>
                <p style="margin:8px 0 0;font-size:13px;color:#c7d2fe;">Email Verification</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;">
                <p style="margin:0 0 8px;font-size:15px;color:#94a3b8;">Hey <strong style="color:#e2e8f0;">${user.username}</strong>,</p>
                <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
                  Use the OTP below to verify your email. It expires in <strong style="color:#e2e8f0;">5 minutes</strong>.
                </p>
                <div style="background-color:#0f172a;border:1px solid #334155;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                  <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:2px;color:#64748b;text-transform:uppercase;">Your OTP</p>
                  <p style="margin:0;font-size:42px;font-weight:700;letter-spacing:12px;color:#ffffff;">${otp}</p>
                </div>
                <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                  If you didn't create a Groommate account, ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #334155;padding:20px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#475569;">© 2025 Groommate. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
            `,
    })

    res.status(201).json({
        message:"OTP sent to your email, please verify to complete regsitration",
        email:user.email
    })
    
    // const accessToken = jwt.sign({
    //     id:user._id,
    //     role:user.role
    // },process.env.JWT_SECRET,{
    //     expiresIn:"15m"
    // })
    // const refreshToken = jwt.sign(
    //     {
    //         id:user._id
    //     },
    //     process.env.REFRESH_SECRET,
    //     {expiresIn:"7d"}
    // )
    // user.refreshToken=refreshToken
    // await user.save()
    // res.cookie("accessToken",accessToken, cookieOptions(15*60*1000))
    // res.cookie("refreshToken", refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000))

    // res.status(201).json({
    //     message:"User Registered Successfully",
    //     user:{
    //         id:user._id,
    //         username:user.username,
    //         email:user.email,
    //         phone_number:user.phone_number,
    //         role:user.role
    //     }
    // })
}

async function loginUser(req,res) {
    const {email,phone_number,password}=req.body

    const user = await userModel.findOne({
        $or:[
            {email},
            {phone_number}
        ]
    })
    if(!user){
        return res.status(401).json({
            message:"User does not exists"
        })
    }

    const isPasswordValid = await bcrypt.compare(password,user.password)
    if (!isPasswordValid){
        return res.status(401).json({
            message:"Invalid password"
        })
    }

    if(!user.isEmailVerified){
        return res.status(401).json({
            message:"Email not verified, please verify your email to login"
        })
    }

    const accessToken = jwt.sign(
    {
        id:user._id,
        role:user.role
    },
    process.env.JWT_SECRET,
    {expiresIn:"15m"}
)

const refreshToken = jwt.sign(
    {
        id:user._id
    },
    process.env.REFRESH_SECRET,
    {expiresIn:"7d"}
)

user.refreshToken = refreshToken
await user.save()

res.cookie("accessToken", accessToken, cookieOptions(15*60*1000))
res.cookie("refreshToken", refreshToken, cookieOptions(7*24*60*60*1000))

    res.status(201).json({
        message:"Login Successfully",
        user:{
            id:user._id,
            username:user.username,
            email:user.email,
            role:user.role
        }
    })
}

async function refreshToken(req,res){
    const refreshToken = req.cookies.refreshToken
    if(!refreshToken){
        return res.status(401).json({message:"No refresh token"})
    }

    try{
        const decoded = jwt.verify(refreshToken,process.env.REFRESH_SECRET)
        const user = await userModel.findById(decoded.id)

        if(!user || user.refreshToken !== refreshToken){
            return res.status(403).json({message:"Invalid refresh token"})
        }

        const accessToken = jwt.sign(
            {
                id:user._id,
                role:user.role
            },
            process.env.JWT_SECRET,
            {expiresIn:"15m"}
        )

        res.cookie("accessToken",accessToken, cookieOptions(15*60*1000))
        res.json({message:"Access token refreshed"})
    }
    catch(err){
        return res.status(403).json({message:"Invalid refresh token"})
    }
}

async function logoutUser(req,res) {
    const refreshToken = req.cookies.refreshToken
    
    if(refreshToken){
        const user = await userModel.findOne({refreshToken})
        if(user){
            user.refreshToken=null
            await user.save()
        }
    }

    res.clearCookie("accessToken", cookieOptions(0))
    res.clearCookie("refreshToken", cookieOptions(0))

    res.json({message:"Logged out"})
}

async function getUser(req,res){
    try {
        const user = await userModel.findById(req.user._id).select("-password")
        res.status(200).json({user})
    } catch (error) {
        return res.status(500).json({message:"Unauthorized"})
    }
}

// async function forgotPassword(req,res){
//     const {email} = req.body
//     try {
//         const user = await userModel.findOne({email})
//         if(!user){
//             return res.status(404).json({message:"User does not exists"})
//         }

//         const otp = crypto.randomInt(100000,999999).toString()
//         const otpExpiry = new Date(Date.now() + 5*60*1000)
//         user.otp.code = otp
//         user.otp.expiresAt = otpExpiry
//         await user.save()

//         await transporter.sendMail({
//             from: `"Groommate" <${process.env.EMAIL_USER}>`,
//             to: user.email,
//             subject: "Your Groommate OTP",
//             html: `
//               <p>Your OTP for password reset is:</p>
//               <h2 style="letter-spacing: 8px">${otp}</h2>
//               <p>This OTP expires in <strong>5 minutes</strong>.</p>
//               <p>If you didn't request this, ignore this email.</p>
//             `,
//         });

//         res.json({message:"OTP sent to your email"})
//     } catch (err) {
//         res.status(500).json({message:"Internal server error"})
//         console.log(err)
//     }
// }

async function forgotPassword(req, res) {
    const { email } = req.body
    try {
        const user = await userModel.findOne({ email })
        if (!user) {
            return res.status(404).json({ message: "User does not exist" })
        }

        const otp = crypto.randomInt(100000, 999999).toString()
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000)
        // `otp` can be undefined for existing users until first set
        user.otp = { code: otp, expiresAt: otpExpiry }
        await user.save()

        await getResend().emails.send({
            from: `Groommate <onboarding@${resend_domain}>`,
            to: user.email,
            subject: "Your Groommate Password Reset OTP",
            html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;">

            <!-- header -->
            <tr>
              <td style="background-color:#4f46e5;padding:32px;text-align:center;">
                <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">✂️ Groommate</p>
                <p style="margin:8px 0 0;font-size:13px;color:#c7d2fe;">Password Reset Request</p>
              </td>
            </tr>

            <!-- body -->
            <tr>
              <td style="padding:36px 32px;">
                <p style="margin:0 0 8px;font-size:15px;color:#94a3b8;">Hey <strong style="color:#e2e8f0;">${user.username}</strong>,</p>
                <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
                  We received a request to reset your Groommate password. Use the OTP below to proceed. It expires in <strong style="color:#e2e8f0;">5 minutes</strong>.
                </p>

                <!-- OTP box -->
                <div style="background-color:#0f172a;border:1px solid #334155;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                  <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:2px;color:#64748b;text-transform:uppercase;">Your OTP</p>
                  <p style="margin:0;font-size:42px;font-weight:700;letter-spacing:12px;color:#ffffff;">${otp}</p>
                </div>

                <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </td>
            </tr>

            <!-- footer -->
            <tr>
              <td style="border-top:1px solid #334155;padding:20px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#475569;">© 2025 Groommate. All rights reserved.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
            `,
        })

        res.json({ message: "OTP sent to your email" })
    } catch (err) {
        res.status(500).json({ message: "Internal server error" })
        console.log("forgotPassword error:", err?.message || err)
        if (err?.response) console.log("Resend response:", err.response)
    }
}

async function verifyOtp(req,res){
    const {email,otp}=req.body;
    try {
        const user = await userModel.findOne({email})
        if (!user || !user.otp.code || !user.otp.expiresAt) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }
        if (user.otp.expiresAt < Date.now()){
            user.otp = null
            await user.save()
            return res.status(400).json({ message: "OTP has expired." });
        }
        if (user.otp.code !== otp){
            return res.status(400).json({ message: "Invalid OTP." });
        }
        res.json({ message: "OTP verified.", verified: true });
    } catch (err) {
        res.status(500).json({message:"Internal server error"})
        console.log(err)
    }
}

async function resetPassword(req,res){
    const {email,otp,newPassword}=req.body;
    try {
        const user = await userModel.findOne({email})
        if (!user || !user.otp.code || user.otp.code !== otp || user.otp.expiresAt < new Date()) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }
        const hash = await bcrypt.hash(newPassword,10)
        user.password = hash
        user.otp = null
        await user.save()
        res.json({message:"Password reset successfully"})
    } catch (err) {
        res.status(500).json({message:"Internal server error"})
        console.error(err)
    }
}

async function verifyEmailOtp(req, res) {
    const { email, otp } = req.body
    try {
        const user = await userModel.findOne({ email }) // ← await added
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        if (user.isEmailVerified) {
            return res.status(400).json({ message: "Email already verified, please login." })
        }
        if (!user.otp.code || !user.otp.expiresAt) {
            return res.status(400).json({ message: "No OTP found, request a new one" })
        }
        if (user.otp.expiresAt < Date.now()) {
            user.otp = { code: null, expiresAt: null }
            await user.save()
            return res.status(400).json({ message: "OTP expired, request a new one" })
        }
        if (user.otp.code !== otp) {
            return res.status(400).json({ message: "Invalid OTP" })
        }

        // OTP is valid — mark verified, generate tokens, send ONE response
        user.isEmailVerified = true
        user.otp = { code: null, expiresAt: null }

        const accessToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        )
        const refreshToken = jwt.sign(
            { id: user._id },
            process.env.REFRESH_SECRET,
            { expiresIn: "7d" }
        )
        user.refreshToken = refreshToken
        await user.save()

        res.cookie("accessToken", accessToken, cookieOptions(15 * 60 * 1000))
        res.cookie("refreshToken", refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000))

        // single response at the end
        return res.status(201).json({
            message: "Email verified successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phone_number: user.phone_number,
                role: user.role
            }
        })
    } catch (err) {
        res.status(500).json({ message: "Internal Server Error" })
        console.log(err)
    }
}

async function resendEmailOtp(req,res) {
    const {email} = req.body
    try {
        const user = await userModel.findOne({email})
        // if (!user){
        //     return res.status(404).json({message:"User not found"})
        // }
        if(user.isEmailVerified){
            return res.status(400).json({message:"Email already in use."})
        }
        const otp = crypto.randomInt(100000,999999).toString()
        const otpExpiry = new Date(Date.now()+ 5*60*1000)
        user.otp = { code: otp, expiresAt: otpExpiry }
        await user.save()

        await getResend().emails.send({
            from: `Groommate <onboarding@${resend_domain}>`,
            to: user.email,
            subject: "Verify your Groommate account",
            html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#4f46e5;padding:32px;text-align:center;">
                <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">✂️ Groommate</p>
                <p style="margin:8px 0 0;font-size:13px;color:#c7d2fe;">Email Verification</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;">
                <p style="margin:0 0 8px;font-size:15px;color:#94a3b8;">Hey <strong style="color:#e2e8f0;">${user.username}</strong>,</p>
                <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
                  Use the OTP below to verify your email. It expires in <strong style="color:#e2e8f0;">5 minutes</strong>.
                </p>
                <div style="background-color:#0f172a;border:1px solid #334155;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                  <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:2px;color:#64748b;text-transform:uppercase;">Your OTP</p>
                  <p style="margin:0;font-size:42px;font-weight:700;letter-spacing:12px;color:#ffffff;">${otp}</p>
                </div>
                <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                  If you didn't create a Groommate account, ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #334155;padding:20px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#475569;">© 2025 Groommate. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
            `,
        })

        res.json({ message: "OTP sent to your email" })
    } catch (err) {
        res.status(500).json({ message: "Internal server error" })
        console.log(err)
    }
}

export default {registerUser,loginUser,refreshToken,logoutUser,getUser,forgotPassword,verifyOtp,resetPassword,verifyEmailOtp,resendEmailOtp}