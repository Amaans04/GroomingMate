import app from './src/app.js'
import { configDotenv } from 'dotenv'
import connectDB from "./src/db/db.js"
configDotenv();

const PORT = process.env.PORT || 3000;

connectDB()

app.listen(PORT, () => {
    console.log(`Backend is live on: http://localhost:${PORT}`);
});