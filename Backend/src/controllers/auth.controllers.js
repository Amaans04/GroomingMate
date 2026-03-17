import userModel from "../models/user.model.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

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

export default {registerUser,loginUser,refreshToken,logoutUser,getUser}