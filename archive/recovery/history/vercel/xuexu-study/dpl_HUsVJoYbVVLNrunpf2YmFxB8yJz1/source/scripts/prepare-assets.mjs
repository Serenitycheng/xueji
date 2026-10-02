import {copyFile,mkdir} from 'node:fs/promises';
await mkdir('public/vendor',{recursive:true});
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/vendor/pdf.worker.min.mjs');
