import mongoose, {Schema} from "mongoose";

const studentSchema = new Schema({
    fullName:{
        type: String,
        required: [true,"full name is required"],
        index:true,
        trim: true
    },
    studentNumber:{
        type: String,
        required: [true, "Student Number is required"],
        unique:true,
        trim:true
    },
    rollNumber:{
        type: String,
        required: [true, "Student Number is required"],
        unique:true,
        trim:true
    },
    gender: {
        type: String,
        required: [true, "gender is required"],
      },
    mobileNumber:{
        type: String,
        required: [true,"mobile number is required"],
        unique:true
    },
    studentEmail:{
        type: String,
        required: [true,"email is required"],
        unique:true,
        lowercase: true,
        trim: true
    },
    branch: {
        type: String,
        required: [true, "branch is required"]
      },
      year:{
        type: Number,
        required: [true,"year is required"],
        min:1,
        max:2
      },
      section: {
        type: String,
        required: [true, "Section is required"]
      },
    residence:{
        type: String,
        required:[true,"residence is required"]
    },
    },
    { timestamps: true }
)

export const Student= mongoose.model("Student", studentSchema)