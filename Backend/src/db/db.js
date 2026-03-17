import mongoose from "mongoose";

async function connectDB() {
    try {
        mongoose.connect(process.env.MONGO_URI)
        console.log('Databse Connected Successfully.')
    } catch (error) {
        console.error('Databse connection error:',error)
    }
}

export default connectDB