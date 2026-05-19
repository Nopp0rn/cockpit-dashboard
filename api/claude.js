// api/claude.js — Vercel Serverless Function (Groq)
// Browser → /api/claude → api.groq.com (ไม่มี CORS)
// ใส่ GROQ_API_KEY ใน Vercel Dashboard → Settings → Environment Variables

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured in Vercel environment variables' })
  }

  try {
    // แปลง Anthropic format → Groq (OpenAI-compatible) format
    const { messages, max_tokens } = req.body

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    messages,
        max_tokens:  max_tokens || 1000,
        temperature: 0.7,
      }),
    })

    const data = await response.json()

    // แปลง Groq response → Anthropic format (ให้ App.jsx ใช้ได้เหมือนเดิม)
    const text = data.choices?.[0]?.message?.content || ''
    return res.status(200).json({
      content: [{ type: 'text', text }]
    })

  } catch (err) {
    console.error('Groq API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
