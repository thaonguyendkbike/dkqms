import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'gemini-api-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/gemini' && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(body);
                  const { prompt, systemInstruction } = parsed;

                  // Dynamic import to avoid browser-side bundling issues in older environments
                  const { GoogleGenAI } = await import('@google/genai');
                  const apiKey = process.env.GEMINI_API_KEY;

                  if (!apiKey) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ 
                      error: 'Không tìm thấy API Key (GEMINI_API_KEY). Vui lòng thêm key trong bảng điều khiển Secrets của Google AI Studio để phân tích trực tiếp bằng trí tuệ nhân tạo.' 
                    }));
                    return;
                  }

                  const ai = new GoogleGenAI({
                    apiKey: apiKey,
                    httpOptions: {
                      headers: {
                        'User-Agent': 'aistudio-build',
                      }
                    }
                  });

                  const config: any = {};
                  if (systemInstruction) {
                    config.systemInstruction = systemInstruction;
                  }

                   const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
                  const maxRetriesPerModel = 3;
                  let lastError: any = null;
                  let response: any = null;

                  for (const model of modelsToTry) {
                    let delay = 1000;
                    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
                      try {
                        console.log(`[Vite Gemini Dev Proxy]: Đang gửi yêu cầu bằng mô hình '${model}' (Lần thử ${attempt}/${maxRetriesPerModel})...`);
                        response = await ai.models.generateContent({
                          model: model,
                          contents: prompt,
                          config: config
                        });
                        break;
                      } catch (err: any) {
                        lastError = err;
                        const errMsg = String(err.message || "").toLowerCase();
                        const isTransient = errMsg.includes("503") || 
                                            errMsg.includes("429") || 
                                            errMsg.includes("unavailable") || 
                                            errMsg.includes("high demand") || 
                                            errMsg.includes("resource") || 
                                            errMsg.includes("overloaded") ||
                                            errMsg.includes("busy") ||
                                            errMsg.includes("temp");

                        console.log(`[Vite Gemini Dev Proxy Trace]: Thử nghiệm mô hình '${model}' (Lần ${attempt}) có kết quả:`, err.message || err);

                        if (isTransient && attempt < maxRetriesPerModel) {
                          await new Promise((resolve) => setTimeout(resolve, delay));
                          delay *= 1.5;
                        } else {
                          break;
                        }
                      }
                    }
                    if (response) break;
                  }

                  if (!response) {
                    throw lastError || new Error("Không thể kết nối đến hệ thống Gemini AI sau khi thử nhiều phương án.");
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ text: response.text }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Lỗi server-side khi kết nối hệ thống Gemini AI.' }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
