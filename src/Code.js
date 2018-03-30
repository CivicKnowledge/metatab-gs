var metaSheetName = 'Meta'
var schemaSheetName = 'Schema'
var dataSheetName = 'Data'

// Script Properties
// <template_key_name> The name of a template to use for initialization -> Google Id for a template spreadsheet. 
// template_id The Google Id for the default template
// decl.metatab.json URl to download the metatab schema document in JSON format. 

// Document Properties
// workflowStarted


function initialize(){
  addMenu(null);
  installTemplate();
  addTermValidation();
  setIdentifiers();
  
}
  
function initialize_example(){
  addMenu(null);
  installTemplate('example.voters');
  addTermValidation();
  setIdentifiers();
  
}

function addMenu(e){

  const menu = SpreadsheetApp.getUi().createAddonMenu(); // Or DocumentApp or FormApp.
  
  if ( e && e.authMode == ScriptApp.AuthMode.NONE) {
    // Add a normal menu item (works in all authorization modes).
  
  } else {
    // Add a menu item based on properties (doesn't work in AuthMode.NONE).
    var properties = PropertiesService.getDocumentProperties();
    var workflowStarted = properties.getProperty('workflowStarted');

  }
  
  // Or DocumentApp or FormApp.
  menu.addItem('Initialize', 'initialize');
  menu.addItem('Initialize with Example', 'initialize_example');
  menu.addSeparator();
  menu.addItem('Show JSON', 'showJSON');
  menu.addItem('Metatab CSV URL', 'showMetatabCSVUrl');
  menu.addSeparator();
  menu.addItem('Publish to S3', 'publishToS3');
  menu.addItem('Publish to CKAN', 'publishToCkan');
  menu.addSeparator();
  menu.addItem('Set CKAN URL and Key', 'openCkanDialog');
  menu.addToUi();
}


function onEdit(e){
  // Set a comment on the edited cell to indicate when it was changed.
  //var range = e.range;
  //range.setNote('Edited '+range.getA1Notation());
  //Logger.log('Edited '+range.getA1Notation());
  //Logger.log(range.getColumn());
  
  
  
}

function onOpen(e) {
  addMenu(e);
}

function onInstall(e) {
  onOpen(e);
}
  

function setProps(){

};



function test(){
    var dataSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(dataSheetName);
    
    Logger.log(convertRangeToCsvFile(dataSheet));

}
