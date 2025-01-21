import { DeepSeekService } from './deepseek-service';

// 示例使用方法
async function example() {
  // 使用单例模式获取服务实例
  const deepseekService = DeepSeekService.getInstance({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
  });

  try {
    const text = `
      人工智能（AI）是计算机科学的一个分支，它致力于创建能够模仿人类智能的系统。
      这些系统可以学习、推理、规划、感知和理解自然语言。深度学习和机器学习是AI的重要组成部分，
      它们使计算机能够从经验中学习并不断改进。
    `;

    const result = await deepseekService.extractKeywords(text);
    console.log('提取的关键词：', result.keywords);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 仅用于测试
if (require.main === module) {
  example();
} 