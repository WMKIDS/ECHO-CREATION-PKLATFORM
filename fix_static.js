const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
code = code.replace(/app\.use\(express\.static\('public'\)\); \/\/ Serve frontend files \(تقديم ملفات الواجهة\)/,
`app.use(express.static('public')); // Serve public frontend files
app.use('/admin', express.static('admin')); // Serve admin files`);
fs.writeFileSync('server.js', code);
