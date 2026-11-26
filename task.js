const path = require('path');
const fs = require('fs');
const os = require('os');
const EventEmitter = require('events');
const zlib = require('zlib');
const { pipeline } = require('stream');


// 1. Log current file path and directory
function logCurrentPaths() {
  console.log({ File: __filename, Dir: __dirname });
}

// 2. Return file name from path
function getFileName(filePath) {
  return path.basename(filePath);
}

// 3. Build a path from an object
function buildPath(obj) {
  return path.format({ dir: obj.dir, name: obj.name, ext: obj.ext });
}

// 4. Return extension
function getExtension(filePath) {
  return path.extname(filePath);
}

// 5. Parse path -> name and ext
function parsePath(filePath) {
  const { name, ext } = path.parse(filePath);
  return { name, ext };
}

// 6. Is absolute?
function isAbsolutePath(p) {
  return path.isAbsolute(p);
}

// 7. Join multiple segments
function joinSegments(...segments) {
  return path.join(...segments);
}

// 8. Resolve relative path to absolute
function resolvePath(relativePath) {
  return path.resolve(relativePath);
}

// 9. Join two paths
function joinTwoPaths(p1, p2) {
  return path.join(p1, p2);
}

// 10. Delete file asynchronously
function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) return console.error('Error:', err.message);
    console.log('The file.txt is deleted.');
  });
}

// 11. Create folder synchronously
function createFolderSync(folderPath) {
  fs.mkdirSync(folderPath, { recursive: true });
  console.log('Success');
}

// 12. Event emitter with "start" event
function startEvent() {
  const emitter = new EventEmitter();
  emitter.on('start', () => console.log('Welcome event triggered!'));
  emitter.emit('start');
}

// 13. Custom "login" event with username
function loginEvent(username) {
  const emitter = new EventEmitter();
  emitter.on('login', (user) => console.log(`User logged in: ${user}`));
  emitter.emit('login', username);
}

// 14. Read file synchronously and log contents
function readFileSyncAndLog(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(content);
  return content;
}

// 15. Write to file asynchronously
function writeFileAsync(filePath, content) {
  fs.writeFile(filePath, content, (err) => {
    if (err) return console.error('Error:', err.message);
    console.log('File written successfully');
  });
}

// 16. Check if a directory exists
function directoryExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

// 17. OS platform and CPU architecture
function getOSInfo() {
  return { Platform: os.platform(), Arch: os.arch() };
}
logCurrentPaths();
console.log(getFileName(__filename));
startEvent();

/* ================= Assignment 2: Streams ================= */
const http = require('http');
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'users.json');

// ---------- helpers: read / write the JSON file on every request ----------
function readUsers() {
  if (!fs.existsSync(FILE)) return [];
  const raw = fs.readFileSync(FILE, 'utf8');
  return raw.trim() ? JSON.parse(raw) : [];
}

function writeUsers(users) {
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2));
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean); // ["user", "1"]
  const method = req.method;

  if (parts[0] !== 'user') return send(res, 404, { message: 'Route not found.' });
  const id = parts[1] !== undefined ? Number(parts[1]) : undefined;

  try {
    // 1) POST /user  -> add new user (email must be unique)
    if (method === 'POST' && parts.length === 1) {
      const { name, age, email } = await getBody(req);
      const users = readUsers();
      if (users.some((u) => u.email === email)) {
        return send(res, 400, { message: 'Email already exists.' });
      }
      const newId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      users.push({ id: newId, name, age, email });
      writeUsers(users);
      return send(res, 201, { message: 'User added successfully.' });
    }

    // 2) PATCH /user/:id  -> update name, age or email
    if (method === 'PATCH' && parts.length === 2) {
      const changes = await getBody(req);
      const users = readUsers();
      const user = users.find((u) => u.id === id);
      if (!user) return send(res, 404, { message: `User ID not found.` });

      const updated = [];
      for (const key of ['name', 'age', 'email']) {
        if (changes[key] !== undefined) {
          user[key] = changes[key];
          updated.push(key);
        }
      }
      writeUsers(users);
      const what = updated.length ? updated.join(', ') : 'data';
      return send(res, 200, { message: `User ${what} updated successfully.` });
    }

    // 3) DELETE /user/:id
    if (method === 'DELETE' && parts.length === 2) {
      const users = readUsers();
      const index = users.findIndex((u) => u.id === id);
      if (index === -1) return send(res, 404, { message: 'User ID not found.' });
      users.splice(index, 1);
      writeUsers(users);
      return send(res, 200, { message: 'User deleted successfully.' });
    }

    // 4) GET /user  -> all users
    if (method === 'GET' && parts.length === 1) {
      return send(res, 200, readUsers());
    }

    // 5) GET /user/:id  -> one user
    if (method === 'GET' && parts.length === 2) {
      const user = readUsers().find((u) => u.id === id);
      if (!user) return send(res, 404, { message: 'User not found.' });
      return send(res, 200, [user]);
    }

    send(res, 404, { message: 'Route not found.' });
  } catch (err) {
    send(res, 400, { message: 'Invalid request.' });
  }
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
