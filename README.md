SillyAndroidTranslationTool
===========================

Provide a web tool to translate android strings with existing i18n resource files (res/value-XX/strings.xml).

Unlike Google translation toolkit(http://translate.google.com/toolkit), this tool enables you to do translation based on base string xml and the existing translated xml both.

Prerequisites
----------------------------
`Nodejs` (http://nodejs.org/download/)

`xml2js` (https://github.com/Leonidas-from-XIV/node-xml2js, for short: [npm](http://npmjs.org) install xml2js -g)

How to use
----------
Clone the repo

Duplicate config example file to a real js file by:
```bash
cp SATTConfig.js.example SATTConfig.js
```

Edit all the config fields in SATTConfig.js, including **androidResPath**, **port** and **targetLanguage**

Start nodejs server with [translate.js](/translate.js)

Visit [localhost:PORT](http://localhost:PORT) to edit strings
