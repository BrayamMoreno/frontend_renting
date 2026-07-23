import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { Asset } from '../models/app-state';

// Declaración global de GEMINI_API_KEY según requerimientos del sistema
declare const GEMINI_API_KEY: string;

@Injectable({
  providedIn: 'root'
})
export class OcrService {
  private ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  async extractAssetsFromImage(base64Image: string): Promise<Asset[]> {
    try {
      const model = "gemini-3-flash-preview";
      const prompt = `
        Analiza esta imagen que es un acta de entrega de equipos IT.
        Extrae la lista de equipos en formato JSON siguiendo estrictamente este esquema:
        [
          { 
            "item": "number",
            "tipo_producto": "string",
            "marca": "string", 
            "modelo": "string", 
            "procesador": "string",
            "disco": "string",
            "tipo_disco": "string",
            "ram": "string",
            "serial": "string",
            "es_cambio": "boolean",
            "cambio_por": "string",
            "ubicacion": "string",
            "comentarios": "string" 
          }
        ].
        Si no puedes determinar la marca o modelo, deja el campo vacío.
        Devuelve SOLO el JSON, sin bloques de código markdown.
      `;

      // Limpiar prefijo base64 si existe
      const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

      const response = await this.ai.models.generateContent({
        model,
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) return [];

      return JSON.parse(text);
    } catch (e) {
      console.error('OCR Error:', e);
      return [];
    }
  }
}
