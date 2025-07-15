const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/registered_photos", express.static(path.join(__dirname, "../facial-recognition/registered_photos")));

app.get("/", (req, res) => {
  res.redirect("/register.html");
});

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return data.trim() === "" ? [] : JSON.parse(data);
  } catch {
    return [];
  }
}

const upload = multer({ dest: "uploads/" });

app.post("/verify", upload.single("face"), (req, res) => {
  const imagePath = req.file?.path;
  const pythonPath = path.join(__dirname, "../facial-recognition/venv/Scripts/python.exe");
  const scriptPath = path.join(__dirname, "../facial-recognition/faceVerifier.py");

  exec(`"${pythonPath}" "${scriptPath}" "${imagePath}"`, (err, stdout, stderr) => {
    fs.unlink(imagePath, () => {});
    if (err) {
      return res.status(500).json({ verified: false });
    }
    const result = stdout.toString().includes("True");
    res.json({ verified: result });
  });
});

app.post("/register", upload.single("photo"), (req, res) => {
  const { name, age } = req.body;
  const imagePath = req.file?.path;
  const pythonPath = path.join(__dirname, "../facial-recognition/venv/Scripts/python.exe");
  const scriptPath = path.join(__dirname, "../facial-recognition/registerVerifier.py");

  exec(`"${pythonPath}" "${scriptPath}" "${name}" ${age} "${imagePath}"`, (err, stdout) => {
    const output = stdout.toString().trim();
    if (output.startsWith("SUCCESS")) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: output.replace("FAIL ", "") });
    }
  });
});

app.get("/candidates", (req, res) => {
  const file = path.join(__dirname, "candidates.json");
  if (!fs.existsSync(file)) return res.json({});
  const data = fs.readFileSync(file, "utf-8");
  res.json(JSON.parse(data));
});

app.get("/active-voter", (req, res) => {
  const db = loadJSON("voters.json");
  res.json(db[db.length - 1] || {});
});

app.get("/check-vote", (req, res) => {
  const face_id = req.query.face_id;
  if (!face_id) return res.json({ voted: false });

  const votes = loadJSON("votes.json");
  const found = votes.find(v => v.face_id === face_id);
  res.json({ voted: !!found });
});

app.post("/submit-vote", express.json(), (req, res) => {
  const selections = req.body.selections;
  const voters = loadJSON("voters.json");
  const voter = voters[voters.length - 1];

  if (!selections || typeof selections !== "object" || !voter) {
    return res.json({ success: false, message: "Invalid vote." });
  }

  let votes = loadJSON("votes.json");
  const already = votes.find(v => v.face_id === voter.face_id || v.name.toLowerCase() === voter.name.toLowerCase());
  if (already) {
    return res.json({ success: false, message: "You have already voted." });
  }

  votes.push({ face_id: voter.face_id, name: voter.name, votes: selections });
  fs.writeFileSync("votes.json", JSON.stringify(votes, null, 2));
  res.json({ success: true });
});

app.get("/vote-results", (req, res) => {
  const votes = loadJSON("votes.json");
  const results = {};
  for (const entry of votes) {
    for (const pos in entry.votes) {
      if (!results[pos]) results[pos] = {};
      const candidate = entry.votes[pos];
      results[pos][candidate] = (results[pos][candidate] || 0) + 1;
    }
  }
  res.json(results);
});

app.get("/voters", (req, res) => {
  const data = loadJSON("voters.json");
  res.json(data);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
