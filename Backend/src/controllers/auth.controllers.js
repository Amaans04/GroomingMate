import userModel from "../models/user.model.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import nodemailer from "nodemailer"
import { configDotenv } from 'dotenv'
configDotenv();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },);

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

    const hash = await bcrypt.hash(password,10)

    const user = await userModel.create({
        username,
        phone_number,
        email,
        password:hash,
        role
    })

    const accessToken = jwt.sign({
        id:user._id,
        role:user.role
    },process.env.JWT_SECRET,{
        expiresIn:"15m"
    })
    const refreshToken = jwt.sign(
        {
            id:user._id
        },
        process.env.REFRESH_SECRET,
        {expiresIn:"7d"}
    )
    user.refreshToken=refreshToken
    await user.save()
    res.cookie("accessToken",accessToken, cookieOptions(15*60*1000))
    res.cookie("refreshToken", refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000))

    res.status(201).json({
        message:"User Registered Successfully",
        user:{
            id:user._id,
            username:user.username,
            email:user.email,
            phone_number:user.phone_number,
            role:user.role
        }
    })
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

async function forgotPassword(req,res){
    const {email} = req.body
    try {
        const user = await userModel.findOne({email})
        if(!user){
            return res.status(404).json({message:"User does not exists"})
        }

        const otp = crypto.randomInt(100000,999999).toString()
        const otpExpiry = new Date(Date.now() + 5*60*1000)
        user.otp.code = otp
        user.otp.expiresAt = otpExpiry
        await user.save()

        await transporter.sendMail({
            from: `"Groommate" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Your Groommate OTP",
            html: `
              <p>Your OTP for password reset is:</p>
              <h2 style="letter-spacing: 8px">${otp}</h2>
              <p>This OTP expires in <strong>5 minutes</strong>.</p>
              <p>If you didn't request this, ignore this email.</p>
            `,
        });

        res.json({message:"OTP sent to your email"})
    } catch (err) {
        res.status(500).json({message:"Internal server error"})
        console.log(err)
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

export default {registerUser,loginUser,refreshToken,logoutUser,getUser,forgotPassword,verifyOtp,resetPassword}

// import userModel from "../models/user.model.js"
// import jwt from "jsonwebtoken"
// import bcrypt from "bcryptjs"
// import crypto from "crypto"
// import nodemailer from "nodemailer"
// import dns from "dns";
// dns.setDefaultResultOrder("ipv4first");

// function cookieOptions(maxAgeMs) {
//     const isProd = process.env.NODE_ENV === "production";
//     return {
//         httpOnly: true,
//         secure: isProd ? true : false,
//         sameSite: isProd ? "none" : "lax",
//         maxAge: maxAgeMs,
//     };
// }

// async function registerUser(req,res) {
//     const {username,phone_number,email,password,role="customer"}=req.body

//     const userExists = await userModel.findOne({
//         $or:[
//             {email},
//             {phone_number}
//         ]
//     })
//     if(userExists){
//         return res.status(409).json({
//             message:"User Already Exists"
//         })
//     }

//     const hash = await bcrypt.hash(password,10)

//     const user = await userModel.create({
//         username,
//         phone_number,
//         email,
//         password:hash,
//         role
//     })

//     const accessToken = jwt.sign({
//         id:user._id,
//         role:user.role
//     },process.env.JWT_SECRET,{
//         expiresIn:"15m"
//     })
//     const refreshToken = jwt.sign(
//         {
//             id:user._id
//         },
//         process.env.REFRESH_SECRET,
//         {expiresIn:"7d"}
//     )
//     user.refreshToken=refreshToken
//     await user.save()
//     res.cookie("accessToken",accessToken, cookieOptions(15*60*1000))
//     res.cookie("refreshToken", refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000))

//     res.status(201).json({
//         message:"User Registered Successfully",
//         user:{
//             id:user._id,
//             username:user.username,
//             email:user.email,
//             phone_number:user.phone_number,
//             role:user.role
//         }
//     })
// }

// async function loginUser(req,res) {
//     const {email,phone_number,password}=req.body

//     const user = await userModel.findOne({
//         $or:[
//             {email},
//             {phone_number}
//         ]
//     })
//     if(!user){
//         return res.status(401).json({
//             message:"User does not exists"
//         })
//     }

//     const isPasswordValid = await bcrypt.compare(password,user.password)
//     if (!isPasswordValid){
//         return res.status(401).json({
//             message:"Invalid password"
//         })
//     }

//     const accessToken = jwt.sign(
//     {
//         id:user._id,
//         role:user.role
//     },
//     process.env.JWT_SECRET,
//     {expiresIn:"15m"}
// )

// const refreshToken = jwt.sign(
//     {
//         id:user._id
//     },
//     process.env.REFRESH_SECRET,
//     {expiresIn:"7d"}
// )

// user.refreshToken = refreshToken
// await user.save()

// res.cookie("accessToken", accessToken, cookieOptions(15*60*1000))
// res.cookie("refreshToken", refreshToken, cookieOptions(7*24*60*60*1000))

//     res.status(201).json({
//         message:"Login Successfully",
//         user:{
//             id:user._id,
//             username:user.username,
//             email:user.email,
//             role:user.role
//         }
//     })
// }

// async function refreshToken(req,res){
//     const refreshToken = req.cookies.refreshToken
//     if(!refreshToken){
//         return res.status(401).json({message:"No refresh token"})
//     }

//     try{
//         const decoded = jwt.verify(refreshToken,process.env.REFRESH_SECRET)
//         const user = await userModel.findById(decoded.id)

//         if(!user || user.refreshToken !== refreshToken){
//             return res.status(403).json({message:"Invalid refresh token"})
//         }

//         const accessToken = jwt.sign(
//             {
//                 id:user._id,
//                 role:user.role
//             },
//             process.env.JWT_SECRET,
//             {expiresIn:"15m"}
//         )

//         res.cookie("accessToken",accessToken, cookieOptions(15*60*1000))
//         res.json({message:"Access token refreshed"})
//     }
//     catch(err){
//         return res.status(403).json({message:"Invalid refresh token"})
//     }
// }

// async function logoutUser(req,res) {
//     const refreshToken = req.cookies.refreshToken
    
//     if(refreshToken){
//         const user = await userModel.findOne({refreshToken})
//         if(user){
//             user.refreshToken=null
//             await user.save()
//         }
//     }

//     res.clearCookie("accessToken", cookieOptions(0))
//     res.clearCookie("refreshToken", cookieOptions(0))

//     res.json({message:"Logged out"})
// }

// async function getUser(req,res){
//     try {
//         const user = await userModel.findById(req.user._id).select("-password")
//         res.status(200).json({user})
//     } catch (error) {
//         return res.status(500).json({message:"Unauthorized"})
//     }
// }


// async function forgotPassword(req,res){
//     const transporter = nodemailer.createTransport({
//         host: "smtp.gmail.com",
//         port: 587,
//         secure: false,
//         auth: {
//           user: process.env.EMAIL_USER,
//           pass: process.env.EMAIL_PASS,
//         },
//         connectionTimeout: 120000, // time to establish connection
//         greetingTimeout: 120000,   // time to receive greeting
//         socketTimeout: 120000,
//       });
//     const {email} = req.body
//     try {
//         const user = await userModel.findOne({email})
//         if(!user){
//             return res.status(404).json({message:"User does not exists"})
//         }

//         const otp = crypto.randomInt(100000,999999).toString()
//         const otpExpirey = new Date(Date.now() + 5*60*1000)
//         user.otp.code = otp
//         user.otp.expiresAt = otpExpirey
//         await user.save()

//         await transporter.sendMail({
//             from: `"Groommate" <${process.env.EMAIL_USER}>`,
//             to: user.email,
//             subject: "Your Groommate OTP",
//             html: `
//               <p>Your OTP for password reset is:</p>
//               <h2 style="letter-spacing: 8px">${otp}</h2>
//               <p>This OTP expires in <strong>10 minutes</strong>.</p>
//               <p>If you didn't request this, ignore this email.</p>
//             `,
//           });

//           res.json({message:"OTP sent to your email"})
//     } catch (err) {
//         res.status(500).json({message:"Internal server error"})
//         console.log(err)
//     }
// }

// async function verifyOtp(req,res){
//     const {email,otp}=req.body;
//     try {
//         const user = await userModel.findOne({email})
//         if (!user || !user.otp.code || !user.otp.expiresAt) {
//             return res.status(400).json({ message: "Invalid or expired OTP." });
//         }
//         if (user.otp.expiresAt < Date.now()){
//             user.otp = null
//             await user.save()
//             return res.status(400).json({ message: "Invalid or expired OTP." });
//         }
//         if (user.otp.code !== otp){
//             return res.status(400).json({ message: "Invalid OTP." });
//         }
//         if (user.otp.code == otp){
//             res.json({ message: "OTP verified.", verified: true });
//         }
//     } catch (err) {
//         res.status(500).json({message:"Internal server error"})
//         console.log(err)
//     }
// }

// async function resetPassword(req,res){
//     const {email,otp,newPassword}=req.body;
//     try {
//         const user = await userModel.findOne({email})
//         if (!user || !user.otp.code || user.otp.code !== otp || user.otp.expiresAt < new Date()) {
//             return res.status(400).json({ message: "Invalid or expired OTP." });
//           }
//         const hash = await bcrypt.hash(newPassword,10)
//         user.password = hash
        
//         user.otp = null
//         await user.save()
//         res.json({message:"Password reset successfully"})
//     } catch (err) {
//         res.status(500).json({message:"Internal server error"})
//         console.error(err)
//     }
// }

// export default {registerUser,loginUser,refreshToken,logoutUser,getUser,forgotPassword,verifyOtp,resetPassword}