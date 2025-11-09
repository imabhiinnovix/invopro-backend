import axios from "axios";
import qs from "qs"; // helps encode data as application/x-www-form-urlencoded

export const getAISummary = async (conditionGroups: any) => {
  try {
    // 1️⃣ Build plain-text description
    const description = JSON.stringify(conditionGroups);

    // 2️⃣ Encode payload like curl -d "notification_description=..."
    const payload = qs.stringify({
      notification_description: description,
    });

    // 3️⃣ Send POST request as form data, not JSON
    const response = await axios.post(
      "http://127.0.0.1:5100/notification-summary",
      payload,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // 4️⃣ Debug log (optional)
    console.log("AI response:", response.data);

    // 5️⃣ Return AI-generated text
    return response.data?.response || "";
  } catch (error: any) {
    console.error("AI summary service failed:", error.message);
    return "";
  }
};