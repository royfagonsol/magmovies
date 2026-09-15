const fs = require('fs');

const axios = require('axios');
const baseUrl           = process.env.REACT_APP_BASE_URL;
const updateAppVersion     = "/api/na_stored_procedure/LIVE_fp_warehouse/CORE_GLOBAL_UpdateAppVersion";

//console.log("ENV", process.env.REACT_APP_VERSION);


async function UpdateAppVersion(environment, app_name, app_version)
{
  //console.log("UpdateAppVersion",environment, app_name, app_version);

  //Retrieve the url from ENV as process.env can't
  fs.readFile('.env', "utf-8", function(err, _data) {
    var lines = _data.split('\r\n');
    lines.filter(function(line, i)
    {
        if(line.indexOf("REACT_APP_BASE_URL") != -1)
        {
          var domain = line.split('=')[1];
          console.log("Domain", domain);

          let url = domain + updateAppVersion;
          console.log("api_url", url);
          let payLoad = 
          {
              "app_name" :  app_name,
              "app_version" :  app_version
          }

          axios.post(url, JSON.stringify(payLoad))
          .then((response) => 
          {        
              if (response.status === 401)
              {    
                  throw new Error("User name or password is incorrect.");
              }
               
              return response;       
          })
          .then((results) =>
          {
              if(results && results.config && results.config.data)
              {
                 console.log("Update complete: ", results.config.data);
              }
          })
          .catch(error=>{
            console.log('\x1b[41m\x1b[37m', error, '\x1b[40m\x1b[37m');
          });
          console.log("UpdateAppVersion - finished");

        }
    });
  })

  //var uld_data = configData.split('=')
  /*
  //Get version from .env in nodejs
  const regex = /\d+(\.\d+)+/g;
  var dx = configData.match(regex); 
  console.log("env-version:", dx[0]);
  */

/*

*/
}


exports.UpdateAppVersion = UpdateAppVersion;

