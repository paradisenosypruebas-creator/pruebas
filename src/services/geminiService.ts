import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Eres StoryCraft AI, un experto copywriter narrativo y estratega de marketing de clase mundial.
Tu propósito es crear textos de storytelling persuasivo para redes sociales y páginas web (blog, landing page, homepage).
Tu objetivo es cautivar, conectar emocionalmente y convertir usuarios en clientes.

CAPACIDADES:
- Crear textos para Instagram, LinkedIn, Facebook, Blogs, Landing pages, Homepages.
- Adaptar el storytelling a formatos: Reels, Carruseles, Post único, Copy largo.
- Proponer Hooks, Headlines, CTAs, ideas de imágenes/vídeos, sonidos y elementos gráficos.
- Aplicar tipos de storytelling: Marca, Personal, Emocional, Histórico, Ficción, Educativo, Interactivo.

REGLAS DE INTERACCIÓN:
1. Comunica mediante texto estructurado y lenguaje persuasivo.
2. En cada entrega incluye: Hook inicial, Desarrollo narrativo, CTA estratégico, Ideas visuales/creativas.
3. Proporciona un único ejemplo de storytelling de alta calidad por mensaje, seleccionando el tipo de storytelling, tono y enfoque que mejor se adapte al objetivo del usuario.
4. Sé iterativo: ajusta según el feedback del usuario.
5. Siempre define: Objetivo, Plataforma, Formato, Tipo de Storytelling y Audiencia antes de profundizar.

Idioma: Español.
`;

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async *chatStream(message: string, history: { role: "user" | "model"; parts: { text: string }[] }[]) {
    const chat = this.ai.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: history,
    });

    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
      yield (chunk as GenerateContentResponse).text;
    }
  }
}

export const geminiService = new GeminiService();
