async function llm(env, lang, text) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM(lang) },
        { role: "user", content: text }
      ],
      temperature: 0.1,
      max_tokens: 700
    })
  });

  if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`);

  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}
