

function showMetatabCSVUrl() {

  SpreadsheetApp.getUi().alert(getMetaCsvUrl());
}


/*
* URL to the Meta sheet of this document, as a CSV.
* The document must be public for anyton else to access this
*/
function getMetaCsvUrl(){

  return gsCsvUrl(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    _getMetaSheet().getSheetId());

}

/*
* URL to the Data sheet of this document, as a CSV.
* The document must be public for anyton else to access this
*/
function getDataCsvUrl(){
  gsCsvUrlBySheetName(SpreadsheetApp.getActiveSpreadsheet().getId(), 
                   dataSheetName);
}

/*
* Look in possibly multiple places to get the 
* identity of this dataset for publication
*/
function getIdentity(){
  return getTermValue("MetatabId",0) || getTermValue("Identifier",0);
}

function publishToS3(){

  const sp = PropertiesService.getScriptProperties()
  
  const secret = sp.getProperty('s3.secret');
  const access = sp.getProperty('s3.access');
  const bucket = sp.getProperty('s3.bucket');
  
  const options = {
    "x-amz-acl" :"public-read"
  }
  
  
  const ident =  getIdentity();
  
  if (!ident){
    SpreadsheetApp.getUi().alert("Can't publish without an Identity or  MetataId term value");
    return false;
  }
  
  var service = new S3(access, secret);
  
  const rowsPayload = Utilities.newBlob(JSON.stringify(
    _getMetaSheet().getDataRange().getValues()),"application/json");
  
  service.putObject(bucket, ident+'/metadata-rows.json', rowsPayload, options);
  
  const jsonPayload =  Utilities.newBlob(parseMetatab(), "text/plain");
  service.putObject(bucket, ident+'/metadata.json',jsonPayload, options);
  
  const template = HtmlService.createTemplateFromFile('publish')
  template.ident = ident;
  
  const html = template.evaluate().setWidth(600).setHeight(200);
  
  var dataSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(dataSheetName);
  
  const csvPayload =  Utilities.newBlob(convertRangeToCsvFile(dataSheet), "text/csv");
  service.putObject(bucket, ident+'/data.csv',csvPayload, options);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Publish');

  return ident;
}

function publishToCkan() {
  var ui = SpreadsheetApp.getUi(); // Same variations.

  var key = PropertiesService.getUserProperties().getProperty('metatab.ckan.key');
  var url = PropertiesService.getUserProperties().getProperty('metatab.ckan.url');
  
  if (!url || !key){
    ui.alert("Set the CKAN URL and Key before publishing");
    return false;
  }
  
  var r = upsertDataset();
  
  if (r.success){
    ui.alert("Published to CKAN");
  } else {
    ui.alert("Failed to publish: "+r.error.message);
  }
  
}

function addCkanResource(d, name, description, format, url){
 
  if (!name || !url){
    return;
  }
  
  if(url.indexOf('http') !==0 && getSheetByName(url)){
    // Assume that the reference is to local data, 
    // in this spreadsheet. 
    url = gsCsvUrlBySheetName(SpreadsheetApp.getActiveSpreadsheet().getId(), url);
    format = "CSV";
  }
  
  var format_map = {
    "CSV": "text/csv"
  }
  
 
  r = {};
  r['name'] = name;
  r['description'] = description;
  r['format'] = format
  r['mimetype'] = format_map[format];
  r['url'] = url;
  
  d.resources.push(r);
  
}




function getCkanClient(){
  return new CkanClient(
    PropertiesService.getUserProperties().getProperty('metatab.ckan.url'),
    PropertiesService.getUserProperties().getProperty('metatab.ckan.key')
  );
}



// Upsert - Create dataset - or update if already exists
function upsertDataset() {
  
  var  datasetInfo = ckanPackageDict();
  
  if (!datasetInfo.name){
    SpreadsheetApp.getUi().alert("Can't publish without a MetataId or Identity term value");
    return false;
  }
  
  var client = getCkanClient();
  
  var r = client.action('package_show', { id: datasetInfo.name });
  
  if (!r.error){
    return client.action('package_update', datasetInfo);
  } else if( r.error && out.error.__type == 'Not Found Error'){ 
    return client.action('package_create', datasetInfo);
  } else {
    return {
      error: {
        __type: 'Unknown',
        message: 'Unknown response from CKAN server'
      }
    }
  }
    
}


function openCkanDialog() {

  const template = HtmlService.createTemplateFromFile('ckanconfig');
  
  var props = PropertiesService.getUserProperties();
  
  template.url = props.getProperty('metatab.ckan.url') 
  template.key = props.getProperty('metatab.ckan.key') 
  
  const html = template.evaluate().setWidth(600).setHeight(200);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'CKAN Settings');
  
  return true;

}


function showMetatabCSVUrl() {

  SpreadsheetApp.getUi().alert(getMetaCsvUrl());
}


/*
* URL to the Meta sheet of this document, as a CSV.
* The document must be public for anyton else to access this
*/
function getMetaCsvUrl(){
  var docKey =  SpreadsheetApp.getActiveSpreadsheet().getId();
  var gid = _getMetaSheet().getSheetId();
  
  return "https://docs.google.com/spreadsheets/d/"+
  docKey + "/export?format=csv&id="+ docKey +"&gid="+gid;
}

/*
* URL to the Data sheet of this document, as a CSV.
* The document must be public for anyton else to access this
*/
function getDataCsvUrl(){
  
  var aspread = SpreadsheetApp.getActiveSpreadsheet();
  var docKey =  aspread.getId();
  var gid = aspread.getSheetByName(dataSheetName).getSheetId();
  
  return "https://docs.google.com/spreadsheets/d/"+
  docKey + "/export?format=csv&id="+ docKey +"&gid="+gid;
}



function publishToS3(){

  const sp = PropertiesService.getScriptProperties()
  
  const secret = sp.getProperty('s3.secret');
  const access = sp.getProperty('s3.access');
  const bucket = sp.getProperty('s3.bucket');
  
  const options = {
    "x-amz-acl" :"public-read"
  }
  
  const basePubUrl = "https://s3.amazonaws.com/gs-add-on.metatab.org/";
  
  const ident =  getTermValue("MetatabId",0) || getTermValue("Identifier",0);


  if (ident){
    var service = new S3(access, secret);
    
     const rowsPayload = Utilities.newBlob(JSON.stringify(
    _getMetaSheet().getDataRange().getValues()),"application/json");
    
    const template = HtmlService.createTemplateFromFile('publish')
    template.ident = ident;
      
    
    service.putObject(bucket, ident+'/metadata-rows.json', rowsPayload, options);
    template.mrjUrl = basePubUrl+ident+"/metadata-rows.json";
    
    const jsonPayload =  Utilities.newBlob(parseMetatab(), "text/plain");
    service.putObject(bucket, ident+'/metadata.json',jsonPayload, options);
    template.mdjUrl = basePubUrl+ident+"/metadata.json";

    var dataSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(dataSheetName);
    
    if (dataSheet){
      const csvPayload =  Utilities.newBlob(convertRangeToCsvFile(dataSheet), "text/csv");
      service.putObject(bucket, ident+'/data.csv',csvPayload, options);
      template.dataUrl = basePubUrl+ident+"/data.csv";
    } else {
      template.dataUrl = null;
    }
      
    const html = template.evaluate().setWidth(600).setHeight(400);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Publish');

    
  } else {
    SpreadsheetApp.getUi().alert("Can't publish without a MetataId term value or an Identifier term value");
    return false;
  }

  return ident;
  
}


function publishToCkan() {
  var ui = SpreadsheetApp.getUi(); // Same variations.

  var key = PropertiesService.getUserProperties().getProperty('metatab.ckan.key');
  var url = PropertiesService.getUserProperties().getProperty('metatab.ckan.url');
  
  if (!url || !key){
    ui.alert("Set the CKAN URL and Key before publishing");
    return false;
  }
  
  var  datasetInfo = ckanPackageDict();
  
  if (!datasetInfo.name){
    SpreadsheetApp.getUi().alert("Can't publish without a MetataId or Identity term value");
    return false;
  }
  
  var client = getCkanClient();
  
  var r = client.action('package_show', { id: datasetInfo.name });
  
  if (!r.error){
    r = client.action('package_update', datasetInfo);
  } else if( r.error && r.error.__type == 'Not Found Error'){ 
    r =  client.action('package_create', datasetInfo);
  } else {
    r =  {
      error: {
        __type: 'Unknown',
        message: 'Unknown response from CKAN server'
      }
    }
  }
  
  if (r.success){
    ui.alert("Published to CKAN");
  } else {
    Logger.log("==== Error ===");
    Logger.log(r);
    ui.alert("Failed to publish: "+ (r.error.message || r.error.__type));
  }
  
}


function addCkanResource(d, name, description, format, url){
 
  if(!name || !url){
    return;
  }
  
  var format_map = {
    "CSV": "text/csv"
  }
 
  if(url &&  url.indexOf('http') !==0 && getSheetByName(url)){
    // Assume that the reference is to local data, 
    // in this spreadsheet. 
    url = gsCsvUrlBySheetName(SpreadsheetApp.getActiveSpreadsheet().getId(), url);
    format = "CSV";
  }
  
  r = {};
  r['name'] = name;
  r['description'] = description;
  r['format'] = format
  r['mimetype'] = format_map[format];
  r['url'] = url;
  
  d.resources.push(r);
  
}


function ckanPackageDict(){
 
  var mt = parseMetatabToDict(metaSheetName);

  d = {
    name: (getIdentity() || '').replace(/[^\w_-]/gi, '-'),
    title: mt.title,
    version: mt.version,
    notes: mt.description,
    resources: [],
    
    
  };
  
  if(mt.creator){
    d.author = mt.creator.name;
    d.author_email = mt.creator.email
  }
  
  if(mt.wrangler){
    d.maintainer = mt.wrangler.name;
    d.maintainer_email = mt.wrangler.email
  }
  
  
  addCkanResource(d, 'metadata','Metadata in Metatab format.','CSV',
                  getMetaCsvUrl());
                  
  
  for(var i = 0; i < mt.datafile.length; i++){
    df = mt.datafile[i]
    Logger.log(df);
    addCkanResource(d, df.title,df.description,df.format || '',df.url);
  
  }
  
  
  return d;
  
}



function getCkanClient(){
  return new CkanClient(
    PropertiesService.getUserProperties().getProperty('metatab.ckan.url'),
    PropertiesService.getUserProperties().getProperty('metatab.ckan.key')
  );
}




function openCkanDialog() {

  const template = HtmlService.createTemplateFromFile('ckanconfig');
  
  var props = PropertiesService.getUserProperties();
  
  template.url = props.getProperty('metatab.ckan.url') 
  template.key = props.getProperty('metatab.ckan.key') 
  
  const html = template.evaluate().setWidth(600).setHeight(200);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'CKAN Settings');
  
  var ui = SpreadsheetApp.getUi(); // Same variations.

  
}


function setCkanSettings(form) {

  PropertiesService.getUserProperties().setProperty('metatab.ckan.key', form.key);
  PropertiesService.getUserProperties().setProperty('metatab.ckan.url', form.url);
  
  // To raise an error:
  // throw "Wacked!";
  
  return true;
}
