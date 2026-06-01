const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Frontend static files serve karne ke liye
app.use(express.static(path.join(__dirname, 'public')));

const BASE_API = 'https://apiserver.deltastudy.site/api/pw';

// Utility function to handle rate-limiting delays if needed
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. All Batches Endpoint
app.get('/api/batches', async (req, res) => {
    try {
        await delay(500); // 0.5s stability delay
        const response = await fetch(`${BASE_API}/batches`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Batches fetch karne me dikkat aayi", details: error.message });
    }
});

// 2. Specific Batch / All Subjects Endpoint
app.get('/api/subjects', async (req, res) => {
    const { batchId } = req.query;
    if (!batchId) return res.status(400).json({ error: "batchId parameter zaroori hai" });
    
    try {
        const response = await fetch(`${BASE_API}/subjects?BatchId=${batchId}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Subjects fetch karne me dikkat aayi", details: error.message });
    }
});

// 3. Dynamic Topics Endpoint (Jo aapne abhi diya)
app.get('/api/topics', async (req, res) => {
    const { batchId, subjectId } = req.query;
    if (!batchId || !subjectId) {
        return res.status(400).json({ error: "batchId aur subjectId dono zaroori hain" });
    }

    try {
        const url = `${BASE_API}/topics?BatchId=${batchId}&SubjectId=${subjectId}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Topics data error", details: error.message });
    }
});

// 4. Dynamic Data Content / Lectures Endpoint (Jo aapne abhi diya)
app.get('/api/datacontent', async (req, res) => {
    const { batchId, subjectSlug, topicSlug, contentType } = req.query;
    
    try {
        const type = contentType || 'videos';
        const url = `${BASE_API}/datacontent?batchId=${batchId}&subjectSlug=${subjectSlug}&topicSlug=${topicSlug}&contentType=${type}`;
        
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Content API error", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running smoothly on port ${PORT}`);
});