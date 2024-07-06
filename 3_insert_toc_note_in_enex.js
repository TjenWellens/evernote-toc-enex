/**
 * Looks for .enex files in ENEX_OUTPUT_DIR
 * and see if BASE_DIR has a matching .xml file (based on filename aka notebook name).
 * Inserts the snippet before the first <note> position in the enex file.
 * Writes to a new file, next to the original enex file <ENEX_OUTPUT_DIR>/<enex-file-path>.toc.enex
 */

const fs = require('node:fs/promises')
const fs_stream = require('node:fs')
const path = require("path")

/**
 * make sure this is different from ENEX_INPUT_DIR (for now)
 * @type {string}
 */
const ENEX_OUTPUT_DIR = "/Users/tjen/Downloads/yarle-run/input/evernote.toc/"
const ENEX_INPUT_DIR = "/Users/tjen/Downloads/yarle-run/input/evernote/"
const BASE_DIR = "./out"

function path2filenameWithoutExtension(path) {
  const filenameWithExtension = path.split("/").reverse()[0];
  return filenameWithExtension.replace(/.enex$/, "")
}

async function matchEnexWithXmlSnippets() {
  const enexDir = await fs.readdir(ENEX_INPUT_DIR, {recursive: true})
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
      enexFilePath: `${ENEX_INPUT_DIR}/${enexFilePath}`,
      enexOutputFilePath: `${ENEX_OUTPUT_DIR}/${enexFilePath}`,
    }
  });
  const matches = pathsGrouped.filter(e => e.xmlSnippetFilePath !== undefined);
  const missing = pathsGrouped.filter(e => e.xmlSnippetFilePath === undefined);
  return {matches, missing};
}

function replaceOnceInFile(enexWithTocPath, enexFilePath, regex, replacement) {
  return new Promise((resolve, reject)=>{
    let replaced = false

    const writableStream = fs_stream.createWriteStream(enexWithTocPath);
    writableStream.on('error', (error) => {
      console.error(`write error: ${error.message}`);
      reject(`write error: ${error.message}`);
    });

    writableStream.on('finish', async () => {
      resolve();
    });

    const readableStream = fs_stream.createReadStream(enexFilePath, 'utf8');
    readableStream.on('error', function (error) {
      console.error(`read error: ${error.message}`);
      reject(`read error: ${error.message}`);
    })

    readableStream.on('data', (chunk) => {
      if (!replaced) {
        replaced = true
        chunk = chunk.toString().replace(regex, replacement)
      }
      writableStream.write(chunk);
    })

    // Once we've finished reading the original file...
    readableStream.on('end', () => {
      writableStream.end(); // emits 'finish' event, executes below statement
    });
  })
}

async function applySnippet(enexFilePath, enexOutputFilePath, xmlSnippetFilePath) {

  const xmlSnippet = await fs.readFile(xmlSnippetFilePath, {encoding: 'utf8'})
  const regex = /<note>/
  const replacement = xmlSnippet + "\n" + "<note>"

  const enexWithTocPath = enexOutputFilePath;
  // const enexWithTocPath = enexFilePath.replace(/.enex$/, ".toc.enex");

  await fs.mkdir(path.dirname(enexOutputFilePath), {recursive:true})

  await replaceOnceInFile(enexWithTocPath, enexFilePath, regex, replacement);

  return Promise.resolve(`added ToC to ${enexWithTocPath}`)
}

async function main() {
  const {matches, missing} = await matchEnexWithXmlSnippets();
  const applied = await Promise.all(
    matches
      // .filter(e => e.enexFilename === 'export_test')
      .map(e => applySnippet(e.enexFilePath, e.enexOutputFilePath, e.xmlSnippetFilePath))
  )

  return Promise.resolve([
    ...applied,
    ...missing.map(e => `failed to find toc for ${e.enexFilePath}`),
  ])
}

main()
  .then(console.log)
  .catch(console.error)