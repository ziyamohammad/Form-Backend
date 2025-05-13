import { Router } from "express";
// const { registerStudent, verifyStudentRegistration } = require("../controller/student.controller");

import { registerStudent, resendOTP, verifyCaptcha, verifyStudentRegistration } from "../controller/student.controller.js";

const router=Router();

router.route("/register").post(registerStudent);

router.route("/verify").post(verifyStudentRegistration);

router.route("/verify-captcha").post(verifyCaptcha);

router.route("/resend-otp").post(resendOTP);

export default router