const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const MODEL = "claude-sonnet-5";

function buildPrompt(userName, periodLabel, stats) {
  const stepLines = (stats.stepBreakdown || [])
    .map((s) => `- ${s.step}: ${s.count}件（担当接続数に対する割合 ${s.ratioOfConnect}%）`)
    .join("\n");

  return `あなたは法人向けテレアポ（電話営業）チームを指導する優秀な営業マネージャーです。
以下は担当者「${userName}」の架電実績データ（対象期間: ${periodLabel}）です。

【全体指標】
- 総架電数: ${stats.totalCalls}件
- 受付BK（受付突破できず）: ${stats.totalUk}件
- 不通: ${stats.totalFu}件
- 担当不在: ${stats.totalFz}件
- 担当接続数（担当BK+アポ）: ${stats.totalConnect}件
- ★アポ獲得数: ${stats.totalApo}件
- 受付突破率（担当接続/総架電）: ${stats.connectRate}%
- 全体アポ率（アポ/総架電）: ${stats.apoRate}%
- 担当接続後のアポ率（アポ/担当接続）: ${stats.apoPerConnectRate}%
- 稼働日数: ${stats.dayCount}日

【担当接続後、アポに至らなかった工程の内訳】（架電プロセス: 目的訴求 → メリット訴求(機能/ベネフィット) → 断り文句への切り返し → クロージング → アポ獲得）
${stepLines}

このデータから、この担当者の架電プロセスにおける「苦手な傾向・弱点」を、データの偏りや離脱が集中している工程を根拠にして具体的に指摘してください。

出力は日本語で、以下の構成で簡潔にまとめてください（300〜500文字程度、見出しは付けてよいが箇条書き中心）：
1. 苦手傾向（データから読み取れる弱点。最大3つ）
2. 改善方法（各弱点に対する具体的で実践的なアクション）

数値の根拠（%や件数）を必ず1つ以上引用してください。データが少なすぎて判断できない場合は、その旨を述べてください。`;
}

exports.analyzeWeakness = onRequest(
  { secrets: [ANTHROPIC_API_KEY], region: "asia-northeast1", cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const { userName, periodLabel, stats } = req.body || {};
    if (!stats || typeof stats !== "object") {
      res.status(400).json({ error: "stats is required" });
      return;
    }

    try {
      const prompt = buildPrompt(userName || "不明", periodLabel || "不明", stats);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.value(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error("Anthropic API error", { status: response.status, errText });
        res.status(502).json({ error: "AI分析サービスへの問い合わせに失敗しました" });
        return;
      }

      const data = await response.json();
      const text = (data.content || [])
        .map((block) => block.text || "")
        .join("\n")
        .trim();

      res.status(200).json({ analysis: text });
    } catch (err) {
      logger.error("analyzeWeakness failed", err);
      res.status(500).json({ error: "サーバーエラーが発生しました" });
    }
  }
);
