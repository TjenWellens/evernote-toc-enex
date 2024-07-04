
prerequisites:
- [evernote dev token](https://dev.evernote.com/doc/articles/dev_tokens.php)
- node
- cloned this repo
- you ran `npm install` within this repo

## 1. run to export all notes metadata
```shell
export EVERNOTE_TOKEN="..."
mkdir out
node 1_get_notes_metadata.js
```
this creates `out/<notebook-name>.json` for each notebook

### (optional util) count duplicate 'created' timestamps
```shell
jq -r '.notes[].created' out/*.json | sort | uniq -c | sort -rn | awk '{if($1>1) s+=$1 ; if($1>1)print} END {print s}'
```

### (optional util) count duplicate 'title' 
```shell
jq -r '.notes[].title' out/*.json | sort | uniq -c | sort -rn | awk '{if($1>1) s+=$1 ; if($1>1)print} END {print s}'
```

### (optional util) count duplicate 'created + title'
```shell
jq -r '.notes[] | [.created, .title] | join(" ")' out/*.json | sort | uniq -c | sort -rn | awk '{if($1>1) s+=$1-1 ; if($1>1)print} END {print s}'
```

## 2. run to create xml for notes (output pasted somewhere specific in .enex file)
```shell
node 2_create_toc_note_xml.js
```