// utils/aiService.ts
import { execSync } from "child_process";

export const getAISummary = async (conditionGroups: any) => {
  try {
    // 1 Build a plain-text description
    const description = JSON.stringify(conditionGroups);

    // 2️ Create the curl command
    const curlCommand = `
      curl -s -X POST http://127.0.0.1:5100/notification-summary \
      -H "Content-Type: application/json" \
      -d '{"notification_description": ${JSON.stringify(description)}}'
    `;

    // 3️ Execute the curl command and capture output
    const result = execSync(curlCommand, { encoding: "utf8" });

    // 4️ Parse JSON safely
    const data = JSON.parse(result);
    console.log(" AI service response:", data);

    // 5 Return AI-generated summary
    return data?.response || "";
  } catch (error: any) {
    console.error(" AI summary service failed:", error.message);
    return ""; // fallback if AI service not available
  }
};
