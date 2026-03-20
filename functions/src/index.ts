import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

admin.initializeApp();

// Rule 1: Daily scheduled function to populate map
export const fetchExternalEventsDaily = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing Gemini API Key in environment");
    return null;
  }

  // Implementation of Rule 2: Using the newest standardized Gemini SDK with Google Search Grounding to find Facebook events
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: "Find 3 upcoming interesting public Facebook events in Katowice, Poland. Extract their title, interest/category, latitude, longitude, time, and the facebook URL. Return ONLY a valid JSON array of objects with strictly these keys: title, interest, latitude, longitude, time (ISO date), externalUrl.",
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2
      }
    });

    const text = response.text || "[]";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const events = JSON.parse(jsonStr);

    const db = admin.firestore();
    const batch = db.batch();

    events.forEach((ev: any) => {
      const docRef = db.collection('events').doc();
      batch.set(docRef, {
        creatorId: 'gemini-bot',
        title: ev.title,
        interest: ev.interest,
        location: {
          latitude: ev.latitude,
          longitude: ev.longitude,
          address: "Fetched from Facebook Networks"
        },
        time: new Date(ev.time),
        isPrivate: false,
        participantLimit: 100,
        tokenCost: 0, // Rule 3: 0 tokens to join external
        isExternal: true, // Rule 3: flagged as external
        externalUrl: ev.externalUrl // Rule 3: strict redirection url
      });
    });

    await batch.commit();
    console.log(`Successfully imported ${events.length} external events via Gemini.`);
  } catch (error) {
    console.error("Error fetching external events:", error);
  }

  return null;
});
