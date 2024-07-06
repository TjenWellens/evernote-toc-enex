prerequisites:

- [evernote dev token](https://dev.evernote.com/doc/articles/dev_tokens.php)
- node (`brew install nvm` + `nvm install --lts` + `nvm use --lts`)
- cloned this repo
- you ran `npm install` within this repo

## 1. run to export all notes metadata

```shell
export EVERNOTE_TOKEN="..."
mkdir out
node 1_get_notes_metadata.js
```

this creates `out/<notebook-name>.json` for each notebook

## 2. run to create xml for notes (output pasted somewhere specific in .enex file)

```shell
node 2_create_toc_note_xml.js
```

## 3. run to create xml for notes (output pasted somewhere specific in .enex file)

! make a backup of your .enex files!

```shell
node 3_insert_toc_note_in_enex.js
```

---

## expected issues

- duplicate notebook names (even if under different evernote stack) will cause one's json to overwrite the other in step 1, and one will seem not to exist (leading to one's ToC note to end up in both)
- if you have 'weird' characters in your notebook names that cannot be used in filenames, you should do some extra
  cleaning in `1_get_notes_metadata.js > sanitizeNotebookFilenames()`
- if you cannot get an evernote developer token, maybe you can try something with Bearer tokens (or however evernote's
  web-app authenticates) instead, but that seems like a longshot
- windows - probably gonna have to change path separators everywhere (.js files) since I used simply `foo/bar`
- windows - probably gonna have to change line endings everywhere (.js files) since I used simply `\n`

## utility stuff

prerequisites

- `brew install jq`

### (util) count duplicate 'created' timestamps

```shell
jq -r '.notes[].created' out/*.json | sort | uniq -c | sort -rn | awk '{if($1>1) s+=$1 ; if($1>1)print} END {print s}'
```

### (util) count duplicate 'title'

```shell
jq -r '.notes[].title' out/*.json | sort | uniq -c | sort -rn | awk '{if($1>1) s+=$1 ; if($1>1)print} END {print s}'
```

### (util) count duplicate 'created + title'

```shell
jq -r '.notes[] | [.created, .title] | join(" ")' out/*.json | sort | uniq -c | sort -rn | awk '{if($1>1) s+=$1-1 ; if($1>1)print} END {print s}'
```
