import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: {
    url: { type: String },
    key: { type: String },
    uploadedAt: { type: Date } 
  }
}, {
  timestamps: true
});

const User = models.User || model("User", UserSchema);

export default User;