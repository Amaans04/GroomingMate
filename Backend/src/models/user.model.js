import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
    },
    phone_number:{
        type:String,
        required:null,
        sparse: true,
        match:[/^[0-9]+$/]
    },
    email:{
        type: String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:null,
    },
    role:{
        type:String,
        required:true,
        enum:['customer','barber']
    },
    refreshToken:{
        type:String
    },
    otp:{
        code:{
            type:String
        },
        expiresAt:{
            type:Date
        }
    },
    isEmailVerified:{
        type:Boolean,
        default:false
    },
    googleId: {
        type: String,
        default: null,
    }
})

const userModel = mongoose.model('user',userSchema)

export default userModel