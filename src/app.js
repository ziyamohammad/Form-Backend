import express from "express"

// import cors from "cors" //allows who can make a request to the server
import session from "express-session";
import cookieParser from "cookie-parser"

const app= express();

// middleware - in between configuration to do a certain task over the code
// app.use(
//     cors({
//         origin: process.env.CORS_ORIGIN,
//         credentials: true
//     })
// )

// Use the session middleware
app.use(session({
    secret: process.env.SECRET_KEY,  // Replace with a strong, random secret key
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,  // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 5 * 60 * 1000, // 5 minutes
    },
}));

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routes

import  userRegister  from "./route/students.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { registerLimiter } from "./middlewares/rateLimiter.js";

app.use("/api/v1/student",userRegister)
app.use(errorHandler)
app.use(registerLimiter)
export { app }