import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { task, mode } = await req.json()
    const prompts = {
      breakdown: `You are a concise business assistant for Kind Collective, a Bangkok-based consumer goods startup with two brands: onest (premium home & personal care) and grubby (natural pet/plant care). Break down this task into 3–5 concrete next steps. Be specific and actionable. Task: "${task.title}" (Brand: ${task.brand}, Priority: ${task.priority}). Return plain text bullet points, max 5 lines total.`,
      risk: `You are a concise business assistant for Kind Collective. Identify 2–3 key risks or blockers for this task and briefly suggest mitigations. Task: "${task.title}" (Brand: ${task.brand}). Return plain text, max 5 lines.`,
      draft: `You are a concise business assistant for Kind Collective. Draft a short professional LINE/Slack message to move this task forward. Task: "${task.title}" (Brand: ${task.brand}, Assignee: ${task.assignee}). Max 4 sentences, direct tone.`
    }
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompts[mode] || prompts.breakdown }]
    })
    return Response.json({ result: message.content[0].text })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
