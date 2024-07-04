const Evernote = require('evernote');
const fs = require('node:fs/promises')

const client = new Evernote.Client({
  token: process.env.EVERNOTE_TOKEN,
  sandbox: false,
  china: false,
});

function replaceSlashes(text) {
  return text.replace("/", "_")
}

const spec = new Evernote.NoteStore.NotesMetadataResultSpec({
  includeTitle: true,
  includeContentLength: true,
  includeCreated: true,
  includeUpdated: true,
  includeDeleted: true,
  includeUpdateSequenceNum: true,
  includeNotebookGuid: true,
  includeTagGuids: true,
  includeAttributes: true,
  includeLargestResourceMime: true,
  includeLargestResourceSize: true,
});

/**
 * PAGE_SIZE can freely change this,
 * when I set it to 500, it silently changed it to 250,
 * but it still downloaded everything in pages of 250.
 * (start index checks how many notes have been downloaded,
 * so PAGE_SIZE is irrelevant for asking the next page)
 * @type {number}
 */
const PAGE_SIZE = 250;

const BASE_DIR = `./out`;

async function writeNotebook(noteStore, notebook) {
  // if (notebook.name !== 'export_test') {
  //   return Promise.resolve(`skipped '${notebook.name}'`)

  // }
  const filter = new Evernote.NoteStore.NoteFilter({
    ascending: true,
    notebookGuid: notebook.guid
  });
  const notesMetadataListPages = []
  const page = await noteStore.findNotesMetadata(filter, 0, PAGE_SIZE, spec)
  notesMetadataListPages.push(page)
  while (countNotesInPages(notesMetadataListPages) < page.totalNotes) {
    const count = countNotesInPages(notesMetadataListPages);
    const page = await noteStore.findNotesMetadata(filter, count, PAGE_SIZE, spec)
    notesMetadataListPages.push(page)

  }
  const filePath = `${BASE_DIR}/${replaceSlashes(notebook.name)}.json`;

  await fs.writeFile(filePath, JSON.stringify({
    startIndex: notesMetadataListPages.map(p => p.startIndex),
    totalNotes: notesMetadataListPages.map(p => p.totalNotes),
    notes: notesMetadataListPages.flatMap(p => p.notes),
    stoppedWords: notesMetadataListPages.map(p => p.stoppedWords),
    searchedWords: notesMetadataListPages.map(p => p.searchedWords),
    updateCount: notesMetadataListPages.map(p => p.updateCount),
  }))

  return Promise.resolve(`saved '${notebook.name}'`)
}

function countNotesInPages(pages) {
  let totalCount = 0
  pages.forEach(p => {
    totalCount += p.notes.length
  })
  return totalCount
}

async function main() {
  const noteStore = client.getNoteStore();
  const notebooks = await noteStore.listNotebooks()
  return await Promise.all(notebooks.map(notebook => writeNotebook(noteStore, notebook)))
}

main()
  .then(console.log)
  .catch(console.error)
