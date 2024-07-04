const fs = require('node:fs/promises')
const sanitizeHtml = require('sanitize-html');
const moment = require("moment")

const BASE_DIR = "./out"

/**
 * evernote:///view/[userId]/[shardId]/[noteGuid]/[noteGuid]/
 * https://dev.evernote.com/doc/articles/note_links.php
 *
 * @param guid
 * @returns {*}
 */
function guid2href(guid) {
  const fakeUserId = `11111111`;
  // evernote:///view/[userId]/[shardId]/[noteGuid]/[noteGuid]/
  const fakeShardId = `s11`;
  return `evernote:///view/${fakeUserId}/${fakeShardId}/${guid}/${guid}/`
}

function title2linktext(title) {
  // sanitize so does not clash with xml stuff (< > " ...)
  return sanitizeHtml(title)
}
function note2link(note){
  return `<li><a style="color:#69aa35;" href="${guid2href(note.guid)}">${title2linktext(note.title)}</a></li>`
}

function metadata2TocNote(metadata) {
  const now = moment().format("YYYYMMDDTHHmmssZ").toString();
  const v = {
    title: "Table of Contents",
    notesXml: metadata.notes.map(note2link).join("\n"),
    created: now, //"20211128T200853Z",
    updated: now, //"20211128T200853Z",
    author: "evernote-toc",
    source: "desktop.mac",
  }

  return `<note><title>${v.title}</title><content><![CDATA[<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note>
<ol>
${v.notesXml}
</ol>
</en-note>
]]></content><created>${v.created}</created><updated>${v.updated}</updated><note-attributes><author>${v.author}</author><source>${v.source}</source></note-attributes>
</note>`
}

async function createTocNote(metadataFilename) {
  const contents = await fs.readFile(`${BASE_DIR}/${metadataFilename}`, {encoding: 'utf8'})
  const metadata = JSON.parse(contents)


  const filePath = `${BASE_DIR}/${metadataFilename.replace(/.json$/, ".xml")}`


  await fs.writeFile(filePath, metadata2TocNote(metadata))

  return Promise.resolve(`created '${metadataFilename}'`)
}

async function main() {
  const dir = await fs.readdir(BASE_DIR)
  return await Promise.all(
    dir
      .filter(folderName => folderName.endsWith(".json"))
      .map(createTocNote)
  )
}

main()
  .then(console.log)
  .catch(console.error)