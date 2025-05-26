const http = require('http');
const dotenv = require('dotenv');
const app = require('./app');

dotenv.config();

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
app.get("/", (req, res) => res.send("Storage Management server is running!"));
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});