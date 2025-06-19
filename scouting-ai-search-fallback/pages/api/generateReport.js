export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { playerName } = req.body;
  if (!playerName) return res.status(400).json({ error: "Player name required" });

  try {
    const prompt = `
You are a professional football scout. Write a detailed scouting report about the player named: ${playerName}. 
Include technical skills, tactical awareness, physical attributes, mentality, and potential rating out of 10.
Write in a formal and structured tone.
`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const rawText = await openaiRes.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      console.error("OpenAI response parse error:", rawText);
      return res.status(500).json({ error: "Invalid response from OpenAI" });
    }

    const report = data.choices?.[0]?.message?.content;
    if (!report) {
      console.error("No report generated from OpenAI:", data);
      return res.status(500).json({ error: "No report generated" });
    }

    res.status(200).json({ report });
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
};
