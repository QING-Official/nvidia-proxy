import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const NVIDIA_API_KEY = Deno.env.get("NVIDIA_API_KEY");
const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

// 串行队列：同一时刻只允许1个请求，防止并发429
let taskQueue = Promise.resolve();
const MAX_CONCURRENT = 1;

async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({msg:"only post"}), {status:200});
  }
  if (!NVIDIA_API_KEY) {
    return new Response(JSON.stringify({error:"缺少NVIDIA_API_KEY环境变量"}), {status:500});
  }

  // 排队机制
  const task = taskQueue.then(async () => {
    try {
      const body = await req.json();
      // 把Operit传来的 /v1/completions 格式转为 NVIDIA chat/completions
      const payload = {
        model: body.model || "nvidia/llama-3.1-nemotron-70b-instruct",
        messages: body.messages || [{role:"user", content:body.prompt}],
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 512
      };

      const res = await fetch(NVIDIA_ENDPOINT, {
        method:"POST",
        headers:{
          "Authorization": `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type":"application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: {"Content-Type":"application/json"}
      });
    } catch(err) {
      return new Response(JSON.stringify({error: String(err)}), {status:500});
    }
  });
  taskQueue = task.catch(()=>{});
  return task;
}

serve(handler, {port: Number(Deno.env.get("PORT") || 8000)});
