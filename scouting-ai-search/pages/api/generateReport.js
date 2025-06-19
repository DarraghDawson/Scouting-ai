import fetch from "node-fetch";
import cheerio from "cheerio";

async function scrapeFbref(playerName) {
  const searchUrl = `https://fbref.com/en/search/search.fcgi?search=${encodeURIComponent(playerName)}`;
  const searchRes = await fetch(searchUrl);
  const searchHtml = await searchRes.text();
  const $search = cheerio.load(searchHtml);

  const firstResult = $search("div.search-item a").first().attr("href");
  if (!firstResult) return null;
  const playerUrl = `https://fbref.com${firstResult}`;

  const playerRes = await fetch(playerUrl);
  const playerHtml = await playerRes.text();
  const $ = cheerio.load(playerHtml);

  const position = $("strong:contains('Position')").parent().text().replace("Position:", "").trim() || "Unknown";
  let appearances = 0, goals = 0;
  $("#stats_standard tbody tr").each((_, el) => {
    const comp = $(el).find("td[data-stat='competition']").text();
    if (comp && comp !== "Totals") {
      appearances += parseInt($(el).find("td[data-stat='games']").text() || 0);
      goals += parseInt($(el).find("td[data-stat='goals']").text() || 0);
    }
  });

  return { position, appearances, goals };
}

async function scrapeTransfermarkt(playerName) {
  const searchUrl = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(playerName)}`;
  const searchRes = await fetch(searchUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const searchHtml = await searchRes.text();
  const $search = cheerio.load(searchHtml);

  const firstResult = $search(".spielprofil_tooltip").first().attr("href");
  if (!firstResult) return null;
  const playerUrl = `https://www.transfermarkt.com${firstResult}`;

  const playerRes = await fetch(playerUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const playerHtml = await playerRes.text();
  const $ = cheerio.load(playerHtml);

  const marketValue = $("div.right-td").find("a").first().text().trim() || "Unknown";
  const club = $("div.dataZusatzbox").find("a.vereinprofil_tooltip").first().text().trim() || "Unknown";
  const nationality = $("table.dataDaten").find("img.flaggenrahmen").first().attr("title") || "Unknown";

  return { marketValue, club, nationality };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { playerName } = req.body;
  if (!playerName) return res.status(400).json({ error: "Player name required" });

  try {
    const fbrefData = await scrapeFbref(playerName);
    const tmData = await scrapeTransfermarkt(playerName);

    const combinedData = {
      ...fbrefData,
      ...tmData,
    };

    const prompt = `
You are a professional football scout. Based on the following data, generate a detailed scouting report including technical, tactical, physical, and mental aspects:

Player: ${playerName}
Position: ${combinedData.position || "Unknown"}
Club: ${combinedData.club || "Unknown"}
Nationality: ${combinedData.nationality || "Unknown"}
Appearances: ${combinedData.appearances || "Unknown"}
Goals: ${combinedData.goals || "Unknown"}
Market Value: ${combinedData.marketValue || "Unknown"}

Write a detailed, formal scouting report.`;

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

    const data = await openaiRes.json();
    const report = data.choices?.[0]?.message?.content || "No report generated.";

    res.status(200).json({ report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate report" });
  }
}
