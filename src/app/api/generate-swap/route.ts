import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizeTrainingBlock } from "@/lib/trainingPlan";
const ALIYUN_API_KEY = process.env.ALIYUN_API_KEY || "";
const API_URL = process.env.LLM_API_URL || "https://coding.dashscope.aliyuncs.com/apps/anthropic/v1/messages";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { profile, missingEquipment, originalBlock, wodContext, lang } = await req.json();
    const isEnglish = lang === 'en';

    if (!profile || !missingEquipment || !originalBlock) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const prompt = `
You are an elite HYROX coach.
The athlete is a ${profile.ageGroup} ${profile.gender}, Level: ${profile.fitnessLevel}, Category: ${profile.category === 'Pro' ? 'Pro' : 'Open'}.
They are currently doing a workout titled: "${wodContext.title}" (${wodContext.description}).
However, they CANNOT use the following equipment right now: ${missingEquipment}.

Their original programmed block was:
Type: ${originalBlock.type}
Name: ${originalBlock.name}
Format: ${originalBlock.format}
Details: ${JSON.stringify(originalBlock.details)}
Target Duration: ${originalBlock.targetDuration || 'N/A'}

Your task: Provide ONE single identical structural replacement block that achieves the exact same metabolic and muscular stimulus WITHOUT using the missing equipment. 
If the original used a SkiErg, replace with Kettlebell Swings, DB Snatches, or Rowing.
If the original used a Sled, replace with Heavy DB Lunges or heavy farmer holds.

${isEnglish
  ? `IMPORTANT: The output MUST be in English. The 'name' and 'details' fields MUST be in English.`
  : `IMPORTANT: The output MUST be localized in Simplified Chinese (简体中文).`
}
The JSON format must strictly match this structure:
{
  "type": "${originalBlock.type}",
  "name": ${isEnglish ? '"e.g., Replacement Block Name (e.g. 4 Rounds, AMRAP 12)"' : '"e.g., 替换同等运动量名称 (如 4 轮, AMRAP 12)"'},
  "format": "${originalBlock.format}",
  "details": ${isEnglish ? '["Replacement move 1", "Replacement move 2"]' : '["替换后的动作 1", "替换后的动作 2"]'},
  "targetDuration": ${originalBlock.targetDuration || 'null'}
}

Return ONLY valid JSON covering this single block.
`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": ALIYUN_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen3.5-plus",
        max_tokens: 4096,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Aliyun API Error:", errText);
      throw new Error(`Aliyun API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const responseText = data.content?.[0]?.text || "";
    
    // Strip markdown formatting if any
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
    const cleanJson = jsonMatch ? jsonMatch[1] : responseText;

    const normalizedBlock = normalizeTrainingBlock(JSON.parse(cleanJson.trim()));
    if (!normalizedBlock) throw new Error("LLM returned an invalid replacement block");

    return NextResponse.json(normalizedBlock);
  } catch (error: any) {
    console.error("Qwen Swap Error:", error);
    return NextResponse.json(
      { error: "Failed to swap workout block", details: error.message },
      { status: 500 }
    );
  }
}
