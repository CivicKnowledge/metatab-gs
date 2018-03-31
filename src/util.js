// Return the meta worksheet, creating it if it does
// not exist. 
function _getMetaSheet(){
  var metaSheet;
  
  var aspread = SpreadsheetApp.getActiveSpreadsheet()
  metaSheet = aspread.getSheetByName(metaSheetName);
  
  if (metaSheet == null){
    metaSheet = aspread.insertSheet();
    metaSheet.setName(metaSheetName)
    Logger.log("Created Sheet");
  }
  
  return metaSheet
}

function getSheetByName(name){

  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(metaSheetName);

}

/*
* Return a URL to a google spreadsheet, given the document key and sheet id
*/
function gsCsvUrl(docId, gid){
    return "https://docs.google.com/spreadsheets/d/"+
            docId + "/export?format=csv&id="+ docId +"&gid="+gid;
}

function gsCsvUrlBySheetName(docId, sheetName){
  
  const remoteSpread = SpreadsheetApp.openById(docId);

  const remoteSheet =  remoteSpread.getSheetByName(sheetName);
  const gid = remoteSheet.getSheetId();
  
  return "https://docs.google.com/spreadsheets/d/"+
            docId + "/export?format=csv&id="+ docId +"&gid="+gid;
}

function gsUrl(docId, gid){
  
  url =  "https://docs.google.com/a/civicknowledge.com/spreadsheets/d/"+
    docId+"/edit";
  
  if (typeof gid != "undefined" ){
    url = url + "&gid="+gid;
  }
  
  return url;
}

function gsUrlBySheetName(docId, sheetName){
  
  const remoteSpread = SpreadsheetApp.openById(docId);

  const remoteSheet =  remoteSpread.getSheetByName(sheetName);
  const gid = remoteSheet.getSheetId();
  
  return "https://docs.google.com/spreadsheets/d/"+
            docId + "/export?format=csv&id="+ docId +"&gid="+gid;
}


function setIdentifiers(){
 
  var decl = getDeclarations();

  if (false){
    // getNextNumber will hit a remote Numers server to get a unique number.
    // Maybe don't really want to do that. 
    var v = getTermValue('MetatabId',0);
    
    if (!v){
      setTermValue('MetatabId',getNextNumber(), 0);
    }
  }
  
  var v = getTermValue('Identifier',0);
  
  if (!v){
    setTermValue('Identifier',Utilities.getUuid(), 0);
  }
 
}

function getSectionTermValidation(sectionName){
  
    var rawTerms = getSectionTerms(sectionName);
    var terms = [];
    for (var i = 0; i < rawTerms.length; i++){
        terms.push(rawTerms[i].replace('Root.','').toTitleCase())
    }

    const rule = SpreadsheetApp.newDataValidation().requireValueInList(terms).build();
  
  return rule;
}

function getTermValueValidationRule(termName){
  // This will only work for top level terms. Getting delcs for lower level terms would
  // require parsing the data. 
    var tdecl = getTermDecl('root.' + termName.toLowerCase())
  
  if (!tdecl || !tdecl['valueset']){
    return null;
  }
 
  var values = []
  
  for (var i in tdecl['valueset']){
    var termVal = tdecl['valueset'][i];
    values.push(termVal['displayvalue'] || termVal['value'] )
  
  }
  
  return SpreadsheetApp.newDataValidation()
  .requireValueInList(values)
  .build();
}


function addTermValidation(){
  
  const metaSheet = _getMetaSheet();
  const lastRowNum = metaSheet.getLastRow();
  
  const values = metaSheet.getDataRange().getValues();
  
  var currentSection = 'root';
  var currentTerms = getSectionTerms(currentSection);
  var currentValidationRule = getSectionTermValidation(currentSection);

    for (var i = 1; i < lastRowNum+1; i++) {

    var tnRange = metaSheet.getRange(i,1)
    var tvRange = metaSheet.getRange(i,2)
    
    var termName =  String(values[i-1][0]).toLowerCase();
    var termValue = String(values[i-1][1]).toLowerCase();
    
    if ( termName == 'section' ){
      currentSection = termValue
      currentTerms = getSectionTerms(currentSection)
      currentValidationRule = getSectionTermValidation(currentSection);
      continue;
    }
    
    tnRange.setDataValidation(currentValidationRule);
    
    tvrule = getTermValueValidationRule(termName)
    
    if (tvrule){
      tvRange.setDataValidation(tvrule);
    }
  }
}


function moveSheetIfExists(sheetName){

  oldSheetName = 'Old '+sheetName
  
  const as = SpreadsheetApp.getActiveSpreadsheet()
  const oldExtant = as.getSheetByName(oldSheetName);
  
  // If the 'old' version already exists, just delete it. 
  if (oldExtant != null){
    as.deleteSheet(oldExtant);
  }
  
  // Move the existing meta sheet to 'old', if it exists. 
  extant = as.getSheetByName(sheetName);
  
  if (extant != null){
    as.setActiveSheet(extant.setName(oldSheetName));
  
    as.moveActiveSheet(as.getNumSheets()); // Move the tab to the end 
  }
}

// Copy a sheet in a remote document to a sheet in this document, using the 
// same name. Moves an existing sheet by that name to 'Old '+name.
// Silently fails if the remote sheet doesn't exists
function copyRemoteSheet(docId, sheetName){
  
  const as = SpreadsheetApp.getActiveSpreadsheet()
  
  const remoteSheet = SpreadsheetApp
  .openById(docId) 
  .getSheetByName(sheetName);
  
  if (remoteSheet) {
    
    moveSheetIfExists(sheetName);
    
    const newSheet = remoteSheet.copyTo(as).setName(sheetName);

    as.setActiveSheet(newSheet);
    as.moveActiveSheet(0);
  }
}


/*
 * Move the current meta sheet to "Old Meta", move it to
 * the last tab, and load a new template from a remote
 * Google spreadsheet. 
 */
function installTemplate(template_key_name){
 
  if (template_key_name == null) {
    template_key_name = 'template_id';
  }
 
  var templateId = PropertiesService.getScriptProperties().getProperty(template_key_name);
  
    if (!templateId) {
        throw ("Did not get a template id from the script properties")
    }


  copyRemoteSheet(templateId, 'Data');
  copyRemoteSheet(templateId, 'Schema');
  copyRemoteSheet(templateId, 'Meta');

}

/* 
 * Load the JSON version of the declarations for Metatab 
 * formatted files
 */
function getDeclarations(){
  
  const url = PropertiesService.getScriptProperties().getProperty('decl.metatab.json')
  
  const cache = CacheService.getScriptCache();
  //cache.remove(url);
  var declarations = cache.get(url);
  
  if (declarations == null) {
     declarations = UrlFetchApp.fetch(url).getContentText(); 
     cache.put(url, declarations, 600);
  } 
  
  return JSON.parse(declarations);
  
}
  
function getTermDecl(term){

  const decl = getDeclarations();
 
  return decl['terms'][term.toLowerCase()]
 
}

function getSectionTerms(section){

  const decl = getDeclarations();
  const sections = decl['sections']
  
    var terms = [];

  if (sections[section]){
        for (var i = 0; i < sections[section]['terms'].length; i++) {

            var term = sections[section]['terms'][i];
            Logger.log(term);
            if (term.indexOf('Root.') == 0) {
                terms.push(term)
            }
        }
        return terms

  } else {
    Logger.log("ERROR: getSectionTerms: No section "+section);
    return [];
  }
}

function getSectionArgs(section){

  const decl = getDeclarations();
  const sections = decl['sections']
  
  if (sections[section]){
    return sections[section]['args'];
  }
}



// Return true of string s is in array arr
function string_is_in(s, arr) {
  if (s[0] == '.'){
    s = s.substr(1);
  }
  for(var i=0; i<arr.length; i++) {
    if (arr[i].toLowerCase() == s.toLowerCase()) {
      return true;
    }
  }
  return false; 
}

// Set a verm value in the meta sheet
function setTermValue(term, value, start_row){

  const meta_sheet = _getMetaSheet();

  const range = SpreadsheetApp.getActiveSheet().getRange("A:B");
  const data = range.getValues();
  
  for( var i = start_row; i <  data.length; i++){
    if (data[i][0].toLowerCase() == term.toLowerCase()){
      range.getCell(i+1, 2).setValue(value);
      return i+1;
    }
  }
  
  return null;
}

// Return the value for a term. Can only get the value in column B
function getTermValue(term,start_row){
  const meta_sheet = _getMetaSheet();

  const range = meta_sheet.getRange("A:B");
  const data = range.getValues();
  
  for( var i = start_row; i <  data.length; i++){
    if (data[i][0].toLowerCase && data[i][0].toLowerCase() == term.toLowerCase()){
      return range.getCell(i+1, 2).getValue();
    }
  }
  
  return null;
 
}


function setAllTermValues(term, value, start_row){

  do {
    start_row =  setTermValue(term, value, start_row);
  } while (start_row !== null);
}

// Return the next number from the number server
function getNextNumber(){

  const numberKey = PropertiesService.getScriptProperties().getProperty('numbers.access_key');
  const numberHost = PropertiesService.getScriptProperties().getProperty('numbers.host')
  const numbersServer = numberHost+'/next?access_key='+numberKey
  
  response = JSON.parse(UrlFetchApp.fetch(numbersServer).getContentText()); 
  
  number = response['number']
  
  return number
  
}



