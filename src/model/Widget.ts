import { Schema, model } from "mongoose";
import { WidgetType, ThemeOption } from "../types/widget";

const WidgetSchema = new Schema({
  ownerId: { type: String, required: true },
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, default: "unnamed" },
  type: { type: String, required: true, enum: Object.values(WidgetType) },
  data: { type: Object, required: true },
  theme: {
    option: { type: String, required: true, enum: Object.values(ThemeOption), default: ThemeOption.SYSTEM },
    customColors: {
      primary: { type: String },
      secondary: { type: String },
      background: { type: String },
      text: { type: String }
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Widget = model("Widget", WidgetSchema);

export default Widget;