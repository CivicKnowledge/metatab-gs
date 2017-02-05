// Hacked, starting from: https://github.com/okfn/ckan.js



function CkanClient(endpoint, apiKey) { 
        
  endpoint = endpoint || '/';
  // strip trailing /
  endpoint = endpoint.replace(/\/$/, '');
  if (!endpoint.match(/\/api$/)) {
    endpoint += '/api';
  }
  
  this.endpoint = endpoint;
  this.apiKey = apiKey;
  
  this.action = function(name, data, cb) {
    if (name.indexOf('dataset_' === 0)) {
      name = name.replace('dataset_', 'package_');
    }
    
    var options =
    {
      'headers' :{
        'X-CKAN-API-KEY': this.apiKey
        },
       'method' : 'post',
       'contentType': 'application/json',
       'payload' : JSON.stringify(data),
       'muteHttpExceptions': true
    };

    //Logger.log("--Request--");
    //Logger.log(options);
    
    var response = UrlFetchApp.fetch(this.endpoint + '/3/action/' + name, options);
    
    //Logger.log("--Response--");
    //Logger.log(response.getContentText());
    
    // Make all of the JSON properties be properties of the response object
    var d = JSON.parse(response.getContentText()); 
    
    d['_headers'] = response.getAllHeaders();
    d['_responseCode'] = response.getResponseCode();
    
    if (cb){
      cb(d);
    }
    
    return d;
    
  };
      
    
  // Parse a normal CKAN resource URL and return API endpoint etc
  //
  // Normal URL is something like http://demo.ckan.org/dataset/some-dataset/resource/eb23e809-ccbb-4ad1-820a-19586fc4bebd
  //
  // :return: { resource_id: ..., endpoint: ... }
  this.parseCkanResourceUrl = function(url) {
      parts = url.split('/');
      var len = parts.length;
      return {
        resource_id: parts[len-1],
        endpoint: parts.slice(0,[len-4]).join('/') + '/api'
      }
   };
};


