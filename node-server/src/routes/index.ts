import { Router } from 'express';
import { SurveyAnalytics } from '../services/analytics';
import { getDb, getRedisClient } from '../db';
import { MongoStorage } from '../db-adapters/mongo';

export const router = Router();

router.get('/stats/:surveyId/:questionId', async (req, res) => {
    const db = getDb();
    const redisClient = getRedisClient();
    const surveyAnalytics = new SurveyAnalytics(db, redisClient);
    try {
        const { surveyId, questionId } = req.params;
        const stats = await surveyAnalytics.getQuestionStats(surveyId, questionId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/post", async (req, res) => {
    const db = getDb();
    const redisClient = getRedisClient();
    const surveyAnalytics = new SurveyAnalytics(db, redisClient);
    try {
        const storage = new MongoStorage(db);
        const postId = req.body.postId;
        const result = req.body.surveyResult;
        storage.postResults(postId, result, async (storedResult: any) => {
            await surveyAnalytics.processTextResponses(storedResult).catch(console.error);
            surveyAnalytics.updateStatsCache(postId).catch(console.error);
            res.status(201).json({ ...storedResult });
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// router.post('/responses', async (req, res) => {
//     const db = getDb();
//     const redisClient = getRedisClient();
//     const surveyAnalytics = new SurveyAnalytics(db, redisClient);
//     try {
//         const response = req.body;
//         const result = await db.collection('responses').insertOne(response);
        
//         surveyAnalytics.updateStatsCache(response.surveyId).catch(console.error);
        
//         surveyAnalytics.processTextResponses(response).catch(console.error);
        
//         res.status(201).json({ ...response, id: result.insertedId });
//     } catch (error: any) {
//         res.status(500).json({ error: error.message });
//     }
// });

// app.post('/responses', async (req, res) => {
//   const response = req.body;
//   const result = await db.collection('responses').insertOne(response);
  
//   processTextResponse(response).catch(console.error);
  
//   res.status(201).json({...response, _id: result.insertedId});
// });

router.get('/surveys/:id', async (req, res) => {
    const db = getDb();
    try {
        const survey = await db.collection<{_id: string, json: any}>('surveys').findOne({ _id: req.params.id });
        if (!survey) return res.status(404).json({ error: 'Survey not found' });
        res.json(survey.json || {});
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/health', async (req, res) => {
    try {
        const redisClient = getRedisClient();
        await redisClient.ping();
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error: any) {
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});