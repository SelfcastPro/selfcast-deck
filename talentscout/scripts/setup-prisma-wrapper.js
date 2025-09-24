#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const binDir = path.join(__dirname, '..', 'node_modules', '.bin');
const wrapperRelativePath = path.relative(binDir, path.join(__dirname, 'prisma-wrapper.js')).split(path.sep).join('/');

function writeUnixWrapper(targetPath) {
  const content = `#!/usr/bin/env node\nrequire('${wrapperRelativePath}');\n`;
  fs.writeFileSync(targetPath, content, 'utf8');
  fs.chmodSync(targetPath, 0o755);
}

function writeCmdWrapper(targetPath) {
  const content = `@ECHO OFF\r\nnode \"%~dp0\\..\\..\\scripts\\prisma-wrapper.js\" %*\r\n`;
  fs.writeFileSync(targetPath, content, 'utf8');
}

function writePs1Wrapper(targetPath) {
  const content = `#!/usr/bin/env pwsh\n& node \"$PSScriptRoot/../scripts/prisma-wrapper.js\" $args\n`;
  fs.writeFileSync(targetPath, content, 'utf8');
}

function replaceBinary(filename, writer) {
  const targetPath = path.join(binDir, filename);
  if (!fs.existsSync(targetPath)) {
    return;
  }

  try {
    fs.rmSync(targetPath, { force: true });
  } catch (error) {
    console.warn(`Unable to remove existing Prisma binary ${filename}:`, error);
    return;
  }

  try {
    writer(targetPath);
  } catch (error) {
    console.warn(`Unable to write Prisma wrapper ${filename}:`, error);
  }
}

replaceBinary('prisma', writeUnixWrapper);
replaceBinary('prisma.cmd', writeCmdWrapper);
replaceBinary('prisma.ps1', writePs1Wrapper);
