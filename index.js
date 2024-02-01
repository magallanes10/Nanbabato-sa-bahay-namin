const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const app = express();
const port = 8080;

const usersFilePath = path.join(__dirname, "users.json");
let users = { users: [] };

if (fs.existsSync(usersFilePath)) {
  const data = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
  users = data.users || { users: [] };
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/video", async (req, res) => {
  try {
    const { username, title1, title2, title3, title4, title5 } = req.body;

    if (!username) {
      return res.status(400).send("Please provide a valid username.");
    }

    const titles = [title1, title2, title3, title4, title5].filter(Boolean);
    if (titles.length === 0) {
      return res.status(400).send("Please provide at least one title.");
    }

    // Generate an API key for the user
    const apiKey = uuidv4();

    // Save user data and API key
    saveUser(username, apiKey, titles);

    // Respond with a JSON containing the video URL and API key
    res.json({ videoUrl: `/video?username=${username}&apiKey=${apiKey}` });

    // Log registration details
    console.log(`Registered user: ${username} at ${new Date().toLocaleString()}`);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("An error occurred while processing the request.");
  }
});

function saveUser(username, apiKey, titles) {
  users.users.push({ username, apiKey, titles, records: [] });
  fs.writeFileSync(usersFilePath, JSON.stringify(users), "utf-8");
}

app.get("/video", async (req, res) => {
  try {
    const { username, apiKey } = req.query;

    if (!username || !apiKey || !users.users.find(user => user.username === username && user.apiKey === apiKey)) {
      return res.status(401).send("Invalid or unauthorized request. Please provide a valid username and API key.");
    }

    const user = users.users.find(user => user.username === username && user.apiKey === apiKey);
    const { titles } = user;

    const randomIndex = Math.floor(Math.random() * titles.length);
    const searchTitle = titles[randomIndex];

    const apiUrl = `https://drab-gray-bat-tutu.cyclic.app/tiktok/searchvideo?keywords=${encodeURIComponent(searchTitle)}&apiKey=${apiKey}`;

    const response = await axios.get(apiUrl, {
      responseType: "json",
      timeout: 5000,
    });

    const videoData = response.data.data.videos[0];

    // Set headers to indicate video content
    res.set({
      "Content-Type": "video/mp4",
      "Content-Disposition": 'inline; filename="video.mp4"',
      "X-Api-Key": apiKey, // Include the API key in response headers
    });

    // Pipe the video stream directly to the response
    const videoStream = await axios.get(videoData.play, { responseType: "stream" });
    videoStream.data.pipe(res);

    // Log the request in user's records
    user.records.push({
      requestNumber: user.records.length + 1,
      timestamp: new Date().toLocaleString(),
    });
    fs.writeFileSync(usersFilePath, JSON.stringify(users), "utf-8");
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("An error occurred while processing the request.");
  }
});

app.get("/history/", (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "history.html"));
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("An error occurred while processing the request.");
  }
});

app.get("/", (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "index.html"));
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("An error occurred while processing the request.");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
