import { Schema, model, models, Document } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: {
    url: { type: String },
    key: { type: String },
    uploadedAt: { type: Date } 
  },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String }
}, {
  timestamps: true
});

UserSchema.set('toJSON', {
  transform: (_doc: Document, ret: Record<string, unknown>) => {
    delete ret.password;
    delete ret.twoFactorSecret;
    delete ret.__v;
    return ret;
  }
});

const User = models.User || model("User", UserSchema);

export default User;
