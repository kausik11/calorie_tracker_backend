const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      lowercase: true,
      default: "other",
      index: true,
    },
    servingSize: {
      type: Number,
      default: 1,
      min: 0.0001,
    },
    servingUnit: {
      type: String,
      trim: true,
      default: "serving",
    },
    calories: {
      type: Number,
      required: true,
      min: 0,
    },
    protein: {
      type: Number,
      required: true,
      min: 0,
    },
    carbs: {
      type: Number,
      required: true,
      min: 0,
    },
    fat: {
      type: Number,
      required: true,
      min: 0,
    },
    fiber: {
      type: Number,
      default: 0,
      min: 0,
    },
    sugar: {
      type: Number,
      default: 0,
      min: 0,
    },
    sodium: {
      type: Number,
      default: 0,
      min: 0,
    },
    potassium: {
      type: Number,
      default: 0,
      min: 0,
    },
    cholesterol: {
      type: Number,
      default: 0,
      min: 0,
    },
    water: {
      type: Number,
      default: 0,
      min: 0,
    },
    micronutrients: {
      type: Map,
      of: Number,
      default: {},
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: "",
    },
    barcode: {
      type: String,
      trim: true,
    },
    pieceWeight: {
      type: Number,
      min: 0.0001,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdByAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

foodSchema.pre("save", function foodPreSave(next) {
  this.isVerified = Boolean(this.isVerified || this.verified);
  this.verified = Boolean(this.verified || this.isVerified);
  next();
});

foodSchema.index({ name: "text", brand: "text", category: "text", barcode: "text" });
foodSchema.index({ category: 1, verified: 1, createdAt: -1 });
foodSchema.index({ barcode: 1 }, { sparse: true });

module.exports = mongoose.model("Food", foodSchema);
