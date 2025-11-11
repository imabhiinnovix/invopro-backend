// utils/aiService.ts
import axios from "axios";

export const getAISummary = async (conditionGroups: any) => {
  try {
    // Build a brief plain-text description from conditionGroups
    const description = JSON.stringify(conditionGroups);

    // Call your local AI service
    const response = await axios.post(`${process.env.BASE_AI_SERVICE_URL}/notification-summary`, {
      notification_description: description,
    },
  { headers: { "Content-Type": "application/json" } });
    console.log('ai response', response);
    // Return the AI’s response text
    return response.data?.data || "";
  } catch (error: any) {
    console.error("AI summary service failed:", error.message);
    return ""; // fallback if service not available
  }
};