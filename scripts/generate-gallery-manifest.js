const fs = require("fs");
const path = require("path");
const sourceRoot = "Q:\\lads_trips\\images";
const folderNames = ["2003 - Kiev","2003b - Berlin","2004 - Kiev","2005 - Budapest","2005 - Kiev Wives","2006 - Poland","2007 - Kiev","2008 - Kiev","2009 - Sofia Bulgaria","2010 - Belgrade Serbia","2011 - Istanbul","2012 - Kiev","2013 - Bosnia - Belgrade","2014 - Minsk","2015 - Utrecht Nederlands","2015 - Vilnius Luthuania","2016 - Gdansk","2016 - Moldova","2017 - Shanghai","2018 - Helsinki & Estonia","2019 - Minsk","2022 - Albania","2023 - Madrid","2023 - Riga","2024 - Bucharest","2025 - Malaga"];
const imageExtensions = new Set([".jpg",".jpeg",".jfif",".png",".webp"]);
const videoExtensions = new Set([".mp4",".mov",".avi",".mts",".m4v",".webm"]);
const naturalSort = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare;
function filesBelow(directory, prefix = "") { const files=[]; for(const entry of fs.readdirSync(directory,{withFileTypes:true})){ const relative=prefix?`${prefix}/${entry.name}`:entry.name; if(entry.isDirectory()) files.push(...filesBelow(path.join(directory,entry.name),relative)); else files.push(relative.replaceAll("\\","/")); } return files; }
const folders={};
for(const folderName of folderNames){ const folderPath=path.join(sourceRoot,folderName); if(!fs.existsSync(folderPath)){ console.warn(`Folder not found: ${folderName}`); folders[folderName]={images:[],videos:[]}; continue; } const files=filesBelow(folderPath); const modifiedSort=(a,b)=>fs.statSync(path.join(folderPath,a)).mtimeMs-fs.statSync(path.join(folderPath,b)).mtimeMs||naturalSort(a,b); folders[folderName]={images:files.filter(file=>!file.includes("/")&&imageExtensions.has(path.extname(file).toLowerCase())).sort(modifiedSort),videos:files.filter(file=>videoExtensions.has(path.extname(file).toLowerCase())).sort(modifiedSort)}; }
const output=path.join(__dirname,"..","public","gallery-manifest.json"); fs.writeFileSync(output,JSON.stringify({generatedAt:new Date().toISOString(),folders})); console.log(`Wrote ${output}`);
