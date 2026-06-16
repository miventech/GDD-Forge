// Patch for Windows + exFAT filesystem issue with Node.js
// See: https://github.com/nodejs/node/issues/51495
//
// On exFAT filesystems, fs.readlink throws EISDIR for regular files.
// This patch wraps readlink to ignore EISDIR errors, allowing Next.js
// to build successfully on Windows + exFAT.

const fs = require('fs');

const originalReadlink = fs.readlink;
const originalReadlinkSync = fs.readlinkSync;

function patchedReadlink(path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  
  originalReadlink(path, options, (err, result) => {
    if (err && err.code === 'EISDIR') {
      // On exFAT, readlink throws EISDIR for regular files
      // Return the path as-is (not a symlink)
      callback(null, path);
    } else {
      callback(err, result);
    }
  });
}

function patchedReadlinkSync(path, options) {
  try {
    return originalReadlinkSync(path, options);
  } catch (err) {
    if (err.code === 'EISDIR') {
      return path;
    }
    throw err;
  }
}

fs.readlink = patchedReadlink;
fs.readlinkSync = patchedReadlinkSync;

// Also patch the promises API if available
if (fs.promises) {
  const originalReadlinkPromise = fs.promises.readlink;
  
  fs.promises.readlink = async function(path, options) {
    try {
      return await originalReadlinkPromise(path, options);
    } catch (err) {
      if (err.code === 'EISDIR') {
        return path;
      }
      throw err;
    }
  };
}
