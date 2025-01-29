const OpenAI = require("openai");
const { HttpsProxyAgent } = require("https-proxy-agent");

// 创建代理
const agent = new HttpsProxyAgent("http://127.0.0.1:7890");

// 创建 OpenAI 客户端实例，使用 GROQ 的 API
const client = new OpenAI({
  apiKey: "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",
  baseURL: "https://api.groq.com/openai/v1",
  httpAgent: agent, // 设置代理
});

async function getGROQResponse(prompt) {
  try {
    console.log("发送请求到 GROQ API...");
    const response = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2048,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("完整错误信息:", {
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    });
    throw error;
  }
}

// 使用示例
async function main() {
  try {
    const prompt = "What is the capital of France?";
    console.log("发送提示:", prompt);
    const response = await getGROQResponse(prompt);
    console.log("GROQ Response:", response);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
