// utils/aiService.ts
import axios from "axios";

export const getAISummary = async (conditionGroups: any) => {
  try {
    // Build a brief plain-text description from conditionGroups
    const description = JSON.stringify(conditionGroups);

    // Call your local AI service
    const response = await axios.post("http://127.0.0.1:5100/notification-summary", {
      notification_description: description,
    });
    console.log('ai response', response);
    // Return the AI’s response text
    return response.data?.response || "";
  } catch (error: any) {
    console.error("AI summary service failed:", error.message);
    return ""; // fallback if service not available
  }
};