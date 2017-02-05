//function demoPutObject() {
//  var env = getTestEnv();
//  var service = new S3(env.awsAccessKeyId, env.awsSecretKey);
//  service.putObject(bucketName_, "objectFoo", "blah ObjectContent blah");
//}
//
//function demoGetObject() {
//  var env = getTestEnv();
//  var service = new S3(env.awsAccessKeyId, env.awsSecretKey);
//  var value = service.getObject(bucketName_, "objectFoo");
//  Logger.log(value);
//}  


// Return the next number from the number server
function testS3Bucket(){

  const sp = PropertiesService.getScriptProperties()
  
  const secret = sp.getProperty('s3.secret');
  const access = sp.getProperty('s3.access');
  const bucket = sp.getProperty('s3.bucket');
  
  payload = JSON.stringify({ "foo": "bar" } ); 
 
  var service = new S3(access, secret);
  service.putObject(bucket, "objectFoo", payload);

}

function testLoading(){

    if (typeof define === 'function' && define.amd) {
        // AMD
        Logger.log("AMD");
    }
    else if (typeof exports === 'object') {
        // CommonJS
        Logger.log("COmmonJS");
    } else if (typeof root !== 'undefined') {
        // Browser globals (Note: root is window)
        Logger.log("ELSE");
        
    } else {
      // Unknown Loading Environment
    }
  
    Logger.log(this);
  
}

function testGenerateRows(){
 
  var ref = "https://raw.githubusercontent.com/CivicKnowledge/metatab-py/master/test-data/children.csv";
  ref = 'Meta';
  
  var d = parseMetatabToDict(ref);
  d = parseMetatabToDict(ref);
  
  /*Logger.log(d.title);
  Logger.log(d.description);
  Logger.log(d.title);
  
  Logger.log(d.creator && d.creator.email);
  Logger.log(d.publisher && d.publisher.email);
  */
  
}



