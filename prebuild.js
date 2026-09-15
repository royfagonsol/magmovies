const path = require('path');
const { exception } = require('console');
const fs = require('fs');
const dt = require('./fp_warehouse_connect');
const { execSync } = require('child_process');
//const { ViewCompactSharp } = require('@material-ui/icons');
//const prompt = require('prompt-sync')();

  var myArgs = process.argv.slice(2);
  var environment = myArgs[0];

  var app_domain = 'uk.co.magnolium.'+myArgs[1];;
  var app_name = myArgs[1];
  var keystore = myArgs[1]+'.keystore';
    
  console.log("**********************");
  console.log("***** PRE-CHANGES ****");
  console.log("**********************");
  console.log("environment: "+environment);
  console.log("app_domain: "+app_domain);
  console.log("app_name: "+app_name);
  //Load in our comand line args, this tells us what type of build we are

  //console.log(environment);
  if (environment != 'dev' && environment != 'training' && environment != 'live')
  {
    throw 'Enviroment is not valid or not supplied: '+environment;
  }

  if (app_name === undefined)
  {
    throw 'Application name is invalid or not supplied: '+environment;
  }

  //Copy the right .env file
  if (fs.existsSync('.env_'+environment))
  {
    fs.copyFileSync('.env_'+environment,'.env');
    console.log('copied .env file');
  }
  else
  {
    throw '.env file does not exist for the loaded envrionment: '+environment;
  }


  //Modify version and app name in config.XML
  fs.copyFileSync('config.xml', 'config_backup.xml');
  var configData = fs.readFileSync('config.xml', 'utf8');

  configData = configData.replace(
    // \w* any number of characters up to the first instance of widget, 
    //the \w* any no characters up to the first instance of "
    new RegExp('\\w*widget id="'+app_domain+'\\w*"')
    //'uk.co.farplants.labelmanager"'
    , 'widget id="'+app_domain+'_'+environment+'"'
  );

  //And the app Name
  //replace the new verion into config.xml
  configData = configData.replace(
    new RegExp('<name>'+app_name+'.*<\\/name>')
    //'uk.co.farplants.labelmanager"'
    , '<name>'+app_name+' '+environment+'<\/name>'
  );

  //now the version number
  //find our version="x.x.x" xmlns string
  var oldVersion = configData.match(/" version="\d*.\d*.\d*" xmlns/);
  //remove the version=" from the front
  oldVersion = oldVersion[0].replace(/ version="/,'');
  //remove '" xmlns from the end to leave us with x.x.x
  oldVersion = oldVersion.replace(/" xmlns/,'').replace('"','');
  //split this into an array
  var versionArray = oldVersion.split('.');
  //Add 1 to the 3rd number the build
  versionArray[2] = (Number(versionArray[2])+1).toString();
  //recombine into a string
  var newVersion = versionArray.join('.');
  //replace the new verion into config.xml
  configData = configData.replace(
    // \w* any number of chracters up to the first instance of widget, 
    //the \w* any no characters up to the first instance of "
    /" version="\d*.\d*.\d*" xmlns/
    //'uk.co.farplants.labelmanager"'
    , '" version="'+newVersion+'" xmlns'
  );

  //console.log(configData);
  fs.writeFileSync('config.xml', configData);


  //And keep package.json in sync
  var packageJSON = fs.readFileSync('package.json', 'utf8');
  packageJSON = packageJSON.replace(
    // \w* any number of chracters up to the first instance of widget, 
    //the \w* any no characters up to the first instance of "
    /"version": "\d*.\d*.\d*",/
    //'uk.co.farplants.labelmanager"'
    , '"version": "'+newVersion+'",'
  );
  packageJSON = packageJSON.replace(
    // \w* any number of chracters up to the first instance of widget, 
    //the \w* any no characters up to the first instance of "
    new RegExp('"name": "'+app_domain+'.*",')
    //'uk.co.farplants.labelmanager"'
    , '"name": "'+app_domain+'_'+environment+'",'
  );
  fs.writeFileSync('package.json',packageJSON);


  //Or we can do the version just straight into the .env file!
  // var envFile = fs.readFileSync('.env', 'utf8');
  // envFile = envFile.replace(
  //   // \w* any number of chracters up to the first instance of widget, 
  //   //the \w* any no characters up to the first instance of "
  //   /REACT_APP_VERSION=\d*.\d*.\d*/
  //   //'uk.co.farplants.labelmanager"'
  //   , 'REACT_APP_VERSION='+newVersion);
  // fs.writeFileSync('.env', envFile);

  // //update the database with the new version
  // dt.UpdateAppVersion(environment, app_name, newVersion);


//
function commandLine(command)
{
  try
  {
    console.log('running: '+command);
    execSync(command);
  }
  catch(e)
  {
    console.log('failed: '+command);
  }
}
