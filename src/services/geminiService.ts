import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ReportInput, AggregationResult } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

const SYSTEM_INSTRUCTION = `You are an Environmental Monitoring Expert. Your task is to analyze images of natural or urban environments and detect environmental issues such as:
- Pollution (air, water, soil)
- Deforestation or illegal logging
- Waste dumping or littering
- Water contamination
- Habitat destruction
- Erosion or land degradation

Provide a detailed analysis including the severity of each issue and actionable recommendations.
You write clear, empathetic alerts for citizens about environmental issues. Use plain language suitable for a mobile notification. Keep length under 100 words.
Return the analysis in a structured JSON format.`;

const unifiedSchema = {
  type: Type.OBJECT,
  required: [
    "overall_status", "summary", "issues", "detected_objects", "issue_category", 
    "confidence", "visual_evidence", "short_description", "citizen_alert", "reporter_notification"
  ],
  properties: {
    overall_status: { type: Type.STRING, description: "One sentence summary of the environmental state" },
    summary: { type: Type.STRING, description: "A detailed professional assessment of the scene" },
    issue_category: { 
      type: Type.STRING, 
      enum: ["deforestation", "landfill", "water_pollution", "air_pollution", "industrial_waste", "urban_litter", "healthy_environment", "uncertain"] 
    },
    confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" },
    visual_evidence: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of 3-5 specific objects or patterns seen in the image supporting the conclusion"
    },
    short_description: { type: Type.STRING, description: "One sentence describing the environmental concern" },
    citizen_alert: { type: Type.STRING, description: "A clear, empathetic alert for citizens about the issue. Plain language, mobile notification style, under 100 words." },
    reporter_notification: { type: Type.STRING, description: "A short notification for the user who reported the issue. Must include the issue category, confidence score, the first suggested action, and a thank you message for their contribution." },
    probable_causes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3 probable causes" },
    suggested_actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3 suggested actions" },
    urgency_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
    detected_objects: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of key environmental features or indicators detected"
    },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["type", "description", "severity", "location_context", "recommendations"],
        properties: {
          type: { type: Type.STRING, description: "Type of issue (e.g., Plastic Pollution, Urban Runoff)" },
          description: { type: Type.STRING, description: "Detailed description of what is seen" },
          severity: { 
            type: Type.STRING, 
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            description: "Severity level of the issue"
          },
          location_context: { type: Type.STRING, description: "Where in the image the issue is concentrated" },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Professional mitigation or restoration actions"
          }
        }
      }
    }
  }
};

export async function analyzeEnvironmentImage(base64Image: string, mimeType: string): Promise<AnalysisResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Analyze this environmental photograph and identify any ecological or environmental issues. Be specific and technical. Provide a forensic breakdown including category and confidence." },
            { 
              inlineData: {
                data: base64Image.split(',')[1] || base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: unifiedSchema
      }
    });

    if (!response.text) throw new Error("No response from AI model");
    return JSON.parse(response.text) as AnalysisResult;
  } catch (error) {
    console.error("Environmental Analysis Error:", error);
    throw error;
  }
}

export async function analyzeEnvironmentMetadata(labels: string[], location?: string): Promise<AnalysisResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `As an Environmental Data Analyst, assess the following data point:
              Labels: ${labels.join(', ')}
              Location (lat, lon): ${location || 'Unknown'}
              
              Provide a professional environmental risk assessment with specific emphasis on probable causes and suggested actions.` 
            }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: unifiedSchema
      }
    });

    if (!response.text) throw new Error("No response from AI model");
    return JSON.parse(response.text) as AnalysisResult;
  } catch (error) {
    console.error("Metadata Analysis Error:", error);
    throw error;
  }
}

export async function translateAnalysisReport(report: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `As a Multilingual Environmental Translator, convert the following JSON analysis report into ${targetLanguage}. Maintain the exact JSON structure and keys, but translate all textual values. Do not translate the 'issue_category', 'urgency_level', 'severity', or any JSON keys. Only translate values meant for human reading (e.g., summary, description, strings).
            
            Report:
            ${JSON.stringify(report, null, 2)}` }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a multilingual environmental translator. Your task is to convert the analysis report into the user's preferred language while preserving all structured information. Always output valid JSON matching the provided schema.",
        responseMimeType: "application/json",
        responseSchema: unifiedSchema
      }
    });

    if (!response.text) throw new Error("No response from AI model");
    return JSON.parse(response.text) as AnalysisResult;
  } catch (error) {
    console.error("Translation Error:", error);
    throw error;
  }
}

export async function verifyLocationMatch(base64Image: string, mimeType: string, latitude: string, longitude: string): Promise<import("../types").GeographicAnalysisResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `Analyze the provided image and assess if it likely matches the location given by latitude: ${latitude}, longitude: ${longitude}. Consider visible landmarks, vegetation, climate indicators, architecture, and urban density.` },
            { 
              inlineData: {
                data: base64Image.split(',')[1] || base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a geographic analyst. Given an image and a user-provided latitude/longitude, determine if the image likely matches that location. Output a probability score between 0 and 1, and reasoning.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["probability_score", "reasoning"],
          properties: {
            probability_score: { type: Type.NUMBER, description: "Confidence score between 0 and 1" },
            reasoning: { type: Type.STRING, description: "Reasoning for the probability score based on visual evidence" }
          }
        }
      }
    });

    if (!response.text) throw new Error("No response from AI model");
    return JSON.parse(response.text) as import("../types").GeographicAnalysisResult;
  } catch (error) {
    console.error("Geographic Analysis Error:", error);
    throw error;
  }
}

export async function aggregateReports(reports: ReportInput[]): Promise<AggregationResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `As an Environmental Data Aggregation Assistant, analyze the following list of reports for a specific area:
            
            ${JSON.stringify(reports, null, 2)}
            
            Produce a summary of the most pressing problems in the area.` }
          ]
        }
      ],
      config: {
        systemInstruction: "You are an environmental data aggregation assistant. Given a list of reports, each with issue_category and confidence, produce a summary of the most pressing problems in the area.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "top_issues", "recommended_regional_actions"],
          properties: {
            summary: { type: Type.STRING, description: "A summary of the most pressing problems" },
            top_issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["category", "average_confidence", "count"],
                properties: {
                  category: { type: Type.STRING },
                  average_confidence: { type: Type.NUMBER },
                  count: { type: Type.NUMBER }
                }
              }
            },
            recommended_regional_actions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of recommended actions to address the regional issues"
            }
          }
        }
      }
    });

    if (!response.text) throw new Error("No response from AI model");
    return JSON.parse(response.text) as AggregationResult;
  } catch (error) {
    console.error("Aggregation Error:", error);
    throw error;
  }
}
