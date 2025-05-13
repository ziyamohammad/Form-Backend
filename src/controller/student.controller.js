import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { Student } from "../models/studentModel.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import nodemailer from "nodemailer";
import session from "express-session";
import axios from "axios";

const otpStore = new Map();

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    secure: true,
    port: 465,   //Gmail generally operates on it.
    auth: {
        user: process.env.EMAIL,  // Email address through which email is sent (e.g., your email@gmail.com)
        pass: process.env.PASSWORD,
    },
});

                function generateOtp() {
                    // return crypto.randomInt(100000, 999999).toString(); 
                    return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
                }

                async function sendOtp(email, otp) {
                    const mailOptions = {
                        from: process.env.EMAIL, 
                        to: email,                
                        subject: 'Your OTP for Registration for Trained&Tuned-25', 
                        text: `Your OTP is: ${otp}. It will expire in 5 minutes.\n\nRegards,\nMLCOE\nOwner` 
                    };

                    try {
                        await transporter.sendMail(mailOptions);
                        console.log(`OTP sent to email: ${email}`);
                        return true; 
                    } catch (error) {
                        console.error('Error sending OTP email:', error);
                        return false;
                    }
                }

// Initialize session middleware
const sessionMiddleware = session({
    secret: 'your-secret-key',  // Replace with a strong, random secret key
    resave: false,
    saveUninitialized: false, // Changed to false
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        httpOnly: true, // Added httpOnly for security
        maxAge: 5 * 60 * 1000, // 5 minutes (same as OTP expiry)
    }, 
});


const registerStudent = asyncHandler(async (req, res) => {
    // Apply session middleware here to ensure req.session is available
    sessionMiddleware(req, res, async () => {
        const { fullName, studentNumber, gender,rollNumber, mobileNumber, studentEmail, branch, year, section, residence } = req.body;
        const userIp = req.headers['x-forwarded-for'] || req.ip;

        const registrationCount = await Student.countDocuments({ ip: userIp });
        if (registrationCount >= 2) {
            throw new ApiError(400, "Registration limit reached for this device.");
        }

        if (!studentEmail.endsWith('@akgec.ac.in')) {
            throw new ApiError(400, "Must Enter College Email Id Only");
        }

        if (!(studentNumber.startsWith('23') || studentNumber.startsWith('24'))) {
            throw new ApiError(401, "Unauthorized student Number");
        }

        const emailExist = await Student.findOne({ studentEmail });
        const numberExist = await Student.findOne({ mobileNumber });
        const studentExist = emailExist || numberExist;

        if (mobileNumber.length !== 10) {
            throw new ApiError(400, "Mobile Number is invalid");
        }

        const parsedMobileNumber = Number(mobileNumber);
        if (isNaN(parsedMobileNumber)) {
            throw new ApiError(400, "Mobile number must be a number");
        }

        if (studentExist) {
            throw new ApiError(401, "Already registered email");
        }

        const otp = generateOtp();

        const otpExpiry = Date.now() + 5 * 60 * 1000;
        req.session.otp = otp;  // Store OTP in session
        req.session.otpExpiry = otpExpiry; // Store expiry

        req.session.userData = {
            fullName, studentNumber, gender, mobileNumber, studentEmail,
            branch, year, section, residence, ip: userIp, otpExpiry,rollNumber
        };

        const otpSent = await sendOtp(studentEmail, otp);
        if (!otpSent) {
            throw new ApiError(500, "Failed to send OTP. Please try again.");
        }

        res.status(200).json(new ApiResponse(200, { studentEmail }, "OTP sent successfully. Please verify your email."));
    });
});



const verifyStudentRegistration = asyncHandler(async (req, res) => {
    // Apply session middleware here as well to access session data
    sessionMiddleware(req, res, async () => {
        const { otp } = req.body;
        const otpString = String(otp);

        if (!req.session.otp) {
            throw new ApiError(400, "OTP not found in session. Please restart registration.");
        }

        if (otpString != req.session.otp) {
            throw new ApiError(401, "Invalid OTP");
        }

        if (req.session.otpExpiry < Date.now()) {
            req.session.otp = null;
            req.session.otpExpiry = null;
            req.session.userData = null;
            throw new ApiError(400, "OTP expired. Please restart registration.");
        }

        const newStudent = await Student.create({
            fullName: req.session.userData.fullName,
            studentNumber: req.session.userData.studentNumber,
            gender: req.session.userData.gender,
            mobileNumber: req.session.userData.mobileNumber,
            studentEmail: req.session.userData.studentEmail,
            branch: req.session.userData.branch,
            year: req.session.userData.year,
            section: req.session.userData.section,
            residence: req.session.userData.residence,
            rollNumber: req.session.userData.rollNumber
        });

        if (!newStudent) {
            throw new ApiError(500, "Failed to create student. Please try again.");
        }

        req.session.otp = null;
        req.session.otpExpiry = null;
        req.session.userData = null;


        res.status(201).json(
            new ApiResponse(201, { student: newStudent }, "Student registered and verified successfully.")
        );
    });
});

const verifyCaptcha = async (req, res) => {
    const { recaptchaValue } = req.body;

    if (!recaptchaValue) {
        return res.status(400).json({ message: 'reCAPTCHA value is missing' });
    }

    try {
        const { data } = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: recaptchaValue,
                },
            }
        );

        if (data.success) {
            return res.status(200).json({ message: 'reCAPTCHA verified successfully' });
        } else {
            return res.status(400).json({ message: 'reCAPTCHA verification failed' });
        }
    } catch (error) {
        console.error('reCAPTCHA error:', error);
        return res.status(500).json({ message: 'reCAPTCHA verification error' });
    }
};

const resendOTP = asyncHandler(async (req, res) => {
    sessionMiddleware(req, res, async () => {
        if (!req.session.userData) {
            throw new ApiError(400, "User data not found in session. Please start registration again.");
        }

        const { studentEmail } = req.session.userData;
        const newOtp = generateOtp();

        const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        req.session.otp = newOtp;
        req.session.otpExpiry = otpExpiry;
        req.session.userData.otpExpiry = otpExpiry; //update the otpExpiry in userData


        const otpSent = await sendOtp(studentEmail, newOtp);
        if (!otpSent) {
            throw new ApiError(500, "Failed to send OTP. Please try again.");
        }

        res.status(200).json(new ApiResponse(200, { studentEmail }, "OTP resent successfully."));
    });
});

export { registerStudent, verifyStudentRegistration,verifyCaptcha,resendOTP };
