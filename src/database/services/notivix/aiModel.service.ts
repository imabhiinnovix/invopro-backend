// utils/aiService.ts
export const getAISummary = async (conditionGroups: any) => {
  try {
    // Build a brief plain-text description from conditionGroups
    const description = `Summarize this notification condition: ${JSON.stringify(conditionGroups)}`;

    // Call your local AI service using fetch
    const response = await fetch("http://127.0.0.1:5100/notification-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notification_description: description,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('ai data', data);
    // Return the AI’s response text
    return data?.response || "";
  } catch (error: any) {
    console.error("AI summary service failed:", error.message);
    return ""; // fallback if service not available
  }
};