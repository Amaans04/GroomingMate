import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
    },
    phone_number:{
        type:String,
        required:true,
        unique:true,
        match:[/^[0-9]+$/]
    },
    email:{
        type: String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true,
    },
    role:{
        type:String,
        required:true,
        enum:['customer','barber']
    },
    refreshToken:{
        type:String
    } 
})

const userModel = mongoose.model('user',userSchema)

export default userModel