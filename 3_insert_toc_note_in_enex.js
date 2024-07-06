/**
 * Looks for .enex files in ENEX_ROOT_DIR
 * and see if BASE_DIR has a matching .xml file (based on filename aka notebook name).
 * Inserts the snippet before the first <note> position in the enex file.
 * Writes to a new file, next to the original enex file <ENEX_ROOT_DIR>/<enex-file-path>.toc.enex
 */

const fs = require('node:fs/promises')
const fs_stream = require('node:fs')

const ENEX_ROOT_DIR = "/Users/tjen/Downloads/yarle-run/input/evernote/"
const BASE_DIR = "./out"

function path2filenameWithoutExtension(path) {
  const filenameWithExtension = path.split("/").reverse()[0];
  return filenameWithExtension.replace(/.enex$/, "")
}

async function matchEnexWithXmlSnippets() {
  const enexDir = await fs.readdir(ENEX_ROOT_DIR, {recursive: true})
  const enexFilePaths = enexDir
    .filter(s => !s.endsWith(".toc.enex"))
    .filter(s => s.endsWith(".enex"));
  const baseDir = await fs.readdir(BASE_DIR)
  const xmlSnippetFilePaths = baseDir.filter(s => s.endsWith(".xml"))
  const xmlSnippetFilePathLookup = xmlSnippetFilePaths.reduce((map, path) => {
    map[path.replace(/.xml$/, "")] = path
    return map
  }, {})

  const pathsGrouped = enexFilePaths.map(enexFilePath => {
    const enexFilename = path2filenameWithoutExtension(enexFilePath);
    const xmlSnippetFilePath = xmlSnippetFilePathLookup[enexFilename]
    return {
      enexFilename,
      xmlSnippetFilePath: xmlSnippetFilePath ? `${BASE_DIR}/${xmlSnippetFilePath}` : xmlSnippetFilePath ,
      enexFilePath: `${ENEX_ROOT_DIR}/${enexFilePath}`,
    }
  });
  const matches = pathsGrouped.filter(e => e.xmlSnippetFilePath !== undefined);
  const missing = pathsGrouped.filter(e => e.xmlSnippetFilePath === undefined);
  return {matches, missing};
}

async function applySnippet(enexFilePath, xmlSnippetFilePath) {
  let replaced = false

  const xmlSnippet = await fs.readFile(xmlSnippetFilePath, {encoding: 'utf8'})
  const regex = /<note>/
  const replacement = xmlSnippet + "\n" + "<note>"

  const enexWithTocPath = enexFilePath.replace(/.enex$/, ".toc.enex");

  const writableStream = fs_stream.createWriteStream(enexWithTocPath);
  writableStream.on('error',  (error) => {
    console.error(`write error: ${error.message}`);
  });

  // // Replace the original file with the updated file
  // writableStream.on('finish', async () => {
  //   try {
  //     await _renameFile(originalFile, updatedFile);
  //     resolve();
  //   } catch (error) {
  //     reject(`Error: Error renaming ${originalFile} to ${updatedFile} => ${error.message}`);
  //   }
  // });

  const readableStream = fs_stream.createReadStream(enexFilePath, 'utf8');
  readableStream.on('error', function (error) {
    console.error(`read error: ${error.message}`);
  })

  readableStream.on('data', (chunk) => {
    if(!replaced) {
      chunk = chunk.toString().replace(regex, replacement)
    }
    writableStream.write(chunk);
  })

  // Once we've finished reading the original file...
  readableStream.on('end', () => {
    writableStream.end(); // emits 'finish' event, executes below statement
  });

  return Promise.resolve(`added ToC to ${enexWithTocPath}`)
}

async function main() {
  const {matches, missing} = await matchEnexWithXmlSnippets();
  const applied = await Promise.all(
    matches
      // .filter(e => e.enexFilename === 'export_test')
      .map(e => applySnippet(e.enexFilePath, e.xmlSnippetFilePath))
  )

  return Promise.resolve([
    ...applied,
    ...missing.map(e => `failed to find toc for ${e.enexFilePath}`),
  ])
}

main()
  .then(console.log)
  .catch(console.error)