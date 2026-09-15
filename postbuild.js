const path = require("path");
const { exception } = require("console");
const fs = require("fs");
const fse = require("fs-extra");
// var apk_name = 'goodsin'; //without the .apk
// var folder = 'GoodsIn';

var myArgs = process.argv.slice(2);
var altName = "";
if (myArgs.length == 3) {
  altName = myArgs[2];
} else {
  altName = myArgs[1];
}
var environment = myArgs[0];

var app_domain = "uk.co.magnolium." + myArgs[1];
var apk_name = myArgs[1];
var folder = myArgs[1];
var keystore = myArgs[1] + ".keystore";

console.log("*****************************");
console.log("***** POST BUILD CHANGES ****");
console.log("*****************************");
console.log("environment: " + environment);
console.log("app_domain: " + app_domain);
console.log("app_name: " + apk_name);

//Load in our comand line args, this tells us what type of build we are

console.log(environment);
if (
  environment != "dev" &&
  environment != "training" &&
  environment != "live"
) {
  throw "Enviroment is not valid or not supplied: " + environment;
}

//rename the apk
fs.copyFileSync(
  ".\\platforms\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk",
  ".\\platforms\\android\\app\\build\\outputs\\apk\\debug\\" + apk_name + ".apk"
);

var deployFolder = "";
var targetFolder = "";
if (environment == "live") {
  targetFolder = "\\\\windows8\\stagenow\\LiveVersions\\" + folder + "\\";
  deployFolder = "\\\\web-b\\IIS_Root\\" + altName;
} else if (environment == "dev") {
  deployFolder = "\\\\web-dev3\\IIS_Root\\" + altName;
  targetFolder =
    "\\\\windows8\\stagenow\\DevelopmentVersions\\" + folder + "\\";
} else if (environment == "training") {
  targetFolder = "\\\\windows8\\stagenow\\TrainingVersions\\" + folder + "\\";
  deployFolder = "\\\\web-training3\\IIS_Root\\" + altName;
}

//copy to stage now
fs.copyFileSync(
  ".\\platforms\\android\\app\\build\\outputs\\apk\\debug\\" +
    apk_name +
    ".apk",
  targetFolder + apk_name + ".apk"
);

//deploy to server
console.log("deploying to server: ", deployFolder);
try {
  fse.copySync(".\\www", deployFolder, { overwrite: true | false });
  console.log("success!");
} catch (err) {
  console.error(err);
}
console.log("deployed to server: ", deployFolder);

//Get a date-time stamp
let localDate = new Date().toISOString().substring(0, 19);
localDate = localDate.replace(/:/g, "-"); //wont copy with colons in the name
//copy to stage now with a date stamp (or a version number?)
fs.copyFileSync(
  ".\\platforms\\android\\app\\build\\outputs\\apk\\debug\\" +
    apk_name +
    ".apk",
  targetFolder + apk_name + "-" + localDate + ".apk"
);
