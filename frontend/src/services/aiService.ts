
import { GoogleGenAI, Type } from "@google/genai";
import { TaskBrief, Sprint } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const aiService = {
  async generateDailyPlan(tasks: TaskBrief[], sprint: Sprint) {
    const prompt = `
      As an expert AI project manager, generate a daily plan for the next 3 days based on the following tasks and sprint context.
      
      Sprint: ${JSON.stringify(sprint)}
      Tasks: ${JSON.stringify(tasks.map(t => ({ 
        id: t.id, 
        goal: t.goal, 
        status: t.meta.status, 
        path: t.path,
        checklist: t.checklist.filter(c => !c.completed),
        relations: t.meta.relations
      })))}
      
      Generate a daily plan in JSON format.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING, description: "Day label like 'Today', 'Tomorrow', 'Day 3'" },
                tasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      taskId: { type: Type.STRING },
                      title: { type: Type.STRING },
                      estimatedTime: { type: Type.STRING },
                      action: { type: Type.STRING, description: "Specific action to take" }
                    }
                  }
                }
              }
            }
          }
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Failed to generate plan:", error);
      return [];
    }
  },

  async detectLinks(tasks: TaskBrief[]) {
    // Logic to detect similar tasks based on goal and technical details
    const prompt = `
      Analyze these task briefs and identify potential relationships (blocks, depends-on, related-to).
      Tasks: ${JSON.stringify(tasks.map(t => ({ id: t.id, goal: t.goal, technicalDetails: t.technicalDetails, path: t.path })))}
      
      Return a list of detected links.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceId: { type: Type.STRING },
                targetId: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["blocks", "depends-on", "related-to"] },
                rationale: { type: Type.STRING }
              }
            }
          }
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Failed to detect links:", error);
      return [];
    }
  }
};
