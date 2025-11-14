import mongoose, { Schema } from "mongoose";

const DownloadRequestSchema = new mongoose.Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'data_source' },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },

    requestPayload: { type: Object, required: true },

    filePath: { type: String },
    fileName: { type: String },
    error: {type: String}
  },
  { timestamps: true }
);

export default mongoose.model("download_request", DownloadRequestSchema);