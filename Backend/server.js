import "dotenv/config";

import app from "./src/app.js";
import connectDB from "./src/db/db.js"

const PORT = process.env.PORT || 3000;

connectDB()

app.listen(PORT, () => {
    console.log(`Backend is live on: http://localhost:${PORT}`);
    // console.log(process.env.EMAIL_USER)
    // console.log(process.env.EMAIL_PASS)
});